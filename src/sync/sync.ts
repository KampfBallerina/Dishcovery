import { useSyncExternalStore } from 'react'
import type { Table } from 'dexie'
import { db, getMeta, save, setMeta, setOnLocalChange, syncedTables, type Synced, type Week } from '../db'
import { addDays, dishIdsOf, isoDate, mondayOf, shiftWeek, weekId } from '../logic/week'
import { DropboxError, download, rpc, upload, type ListResult } from './dropbox'
import { isAhead, merge, strip } from './merge'

export interface SyncStatus {
  state: 'off' | 'idle' | 'syncing' | 'error'
  lastSync?: number
  error?: string
}

let status: SyncStatus = { state: 'off' }
const listeners = new Set<() => void>()
const setStatus = (s: Partial<SyncStatus>) => {
  status = { ...status, ...s }
  listeners.forEach((l) => l())
}
export const useSyncStatus = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => status)

let running = false
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Debounced sync after local edits. */
export function requestSync(delay = 1500) {
  clearTimeout(timer)
  timer = setTimeout(sync, delay)
}
setOnLocalChange(requestSync)

export async function sync() {
  if (running) return void (again = true)
  const root = await getMeta<string>('root')
  if (!root || !(await getMeta('auth'))) return setStatus({ state: 'off' })
  if (!navigator.onLine) return
  running = true
  setStatus({ state: 'syncing', error: undefined })
  try {
    // Upload conflicts mean someone else wrote first: pull their version, merge, try again.
    for (let i = 0; i < 3; i++) {
      await pull(root)
      if (!(await push(root))) break
    }
    await cleanupWeeks(root)
    setStatus({ state: 'idle', lastSync: Date.now() })
  } catch (e) {
    console.error(e)
    setStatus({ state: 'error', error: e instanceof DropboxError ? `Dropbox ${e.status}` : String(e) })
  } finally {
    running = false
    if (again) {
      again = false
      requestSync(0)
    }
  }
}

async function pull(root: string) {
  const cursor = await getMeta<string>('cursor')
  let res: ListResult
  try {
    res = cursor
      ? await rpc('files/list_folder/continue', { cursor })
      : await rpc('files/list_folder', { path: root, recursive: true })
  } catch (e) {
    // Expired cursor: start over with a full listing.
    if (cursor && e instanceof DropboxError && e.status === 409) {
      await db.meta.delete('cursor')
      return pull(root)
    }
    throw e
  }
  for (;;) {
    for (const entry of res.entries) {
      const [folder, name, ...more] = entry.path_lower.slice(root.length + 1).split('/')
      if (!name || more.length) continue
      const id = name.replace(/\.json$/, '')
      if (folder === 'weeks' && entry['.tag'] === 'deleted') await db.weeks.delete(id)
      if (entry['.tag'] !== 'file') continue
      if (folder === 'photos') {
        const path = `photos/${name}`
        if (!(await db.photos.get(path))) await db.photos.put({ path, blob: await download(entry.path_lower), _dirty: 0 })
      } else if ((syncedTables as readonly string[]).includes(folder) && name.endsWith('.json')) {
        await pullRecord(folder as (typeof syncedTables)[number], id, entry.path_lower, entry.rev!)
      }
    }
    await setMeta('cursor', res.cursor)
    if (!res.has_more) break
    res = await rpc('files/list_folder/continue', { cursor: res.cursor })
  }
}

async function pullRecord(tableName: (typeof syncedTables)[number], id: string, path: string, rev: string) {
  const table = db[tableName] as unknown as Table<Synced, string>
  if ((await table.get(id))?._rev === rev) return // our own upload
  const remote = JSON.parse(await (await download(path)).text()) as Synced
  await db.transaction('rw', table, async () => {
    const local = await table.get(id)
    if (!local) return table.put({ ...remote, id, _rev: rev, _dirty: 0 })
    const merged = merge(local, remote)
    await table.put({ ...merged, _rev: rev, _dirty: local._dirty || isAhead(merged, remote) ? 1 : 0 })
  })
}

/** Returns true if any upload hit a conflict. */
async function push(root: string) {
  let conflict = false
  for (const tableName of syncedTables) {
    const table = db[tableName] as unknown as Table<Synced, string>
    for (const item of await table.where('_dirty').equals(1).toArray()) {
      try {
        const { rev } = await upload(`${root}/${tableName}/${item.id}.json`, JSON.stringify(strip(item)), item._rev)
        await db.transaction('rw', table, async () => {
          const cur = (await table.get(item.id))!
          // Stays dirty if it was edited while uploading.
          const unchanged = JSON.stringify(cur._ts) === JSON.stringify(item._ts)
          await table.put({ ...cur, _rev: rev, _dirty: unchanged ? 0 : 1 })
        })
      } catch (e) {
        if (!(e instanceof DropboxError && e.conflict)) throw e
        conflict = true
      }
    }
  }
  for (const photo of await db.photos.where('_dirty').equals(1).toArray()) {
    try {
      await upload(`${root}/${photo.path}`, photo.blob)
    } catch (e) {
      if (!(e instanceof DropboxError && e.conflict)) throw e // photo paths are unique, a conflict means it's already there
    }
    await db.photos.update(photo.path, { _dirty: 0 })
  }
  return conflict
}

/** Keeps last, current and next week. Older weeks leave their dates in dish.lastEaten, then get deleted. */
async function cleanupWeeks(root: string) {
  const oldest = shiftWeek(weekId(new Date()), -1)
  for (const week of await db.weeks.where('id').below(oldest).toArray()) {
    await recordLastEaten(week)
    try {
      await rpc('files/delete_v2', { path: `${root}/weeks/${week.id}.json` })
    } catch (e) {
      if (!(e instanceof DropboxError && e.status === 409)) throw e // already deleted by another device
    }
    await db.weeks.delete(week.id)
  }
}

async function recordLastEaten(week: Week) {
  const date = isoDate(addDays(mondayOf(week.id), 6))
  for (const id of new Set(dishIdsOf(week))) {
    const dish = await db.dishes.get(id)
    if (dish && (dish.lastEaten ?? '') < date) await save(db.dishes, id, { lastEaten: date })
  }
}

/** Switching household folders: everything local gets uploaded into the new one. */
export async function chooseRoot(path: string) {
  await setMeta('root', path)
  await db.meta.delete('cursor')
  for (const name of syncedTables)
    await (db[name] as unknown as Table<Synced, string>).toCollection().modify({ _rev: undefined, _dirty: 1 })
  await db.photos.toCollection().modify({ _dirty: 1 })
  requestSync(0)
}

export function startAutoSync() {
  sync()
  addEventListener('online', () => sync())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && sync())
  setInterval(() => document.visibilityState === 'visible' && sync(), 60000)
}
