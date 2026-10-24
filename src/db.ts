import Dexie, { type Table } from 'dexie'

/** Per-field timestamps (ms) for last-write-wins merging, see docs/sync.md. */
export type Ts = Record<string, number>

export interface Synced {
  id: string
  _ts: Ts
  /** 1 = has local changes not yet uploaded (0/1 because IndexedDB can't index booleans). */
  _dirty?: 0 | 1
  /** Dropbox rev of the file this record was last synced with. */
  _rev?: string
  deleted?: boolean
}

export interface Ingredient {
  amount?: number
  unit?: string
  name: string
}

export interface Dish extends Synced {
  name: string
  /** Path relative to the household folder, e.g. "photos/<uuid>.jpg". */
  photo?: string
  videoUrl?: string
  sourceUrl?: string
  ingredients: Ingredient[]
  steps: string[]
  servings: number
  minutes?: number
  tags: string[]
  notes?: string
  favorite: boolean
  /** ISO date, written when an old week gets cleaned up. */
  lastEaten?: string
  updatedBy?: string
}

export type Meal = 'mittag' | 'abend'
export type SlotKey = `${number}-${Meal}`
export interface Slot {
  dishId: string | null
  locked: boolean
}
/** id = ISO week like "2026-w43". Keys "0-abend" … "6-mittag", day 0 = Monday. Lunch is hidden when its key is null/missing. */
export type Week = Synced & { [K in SlotKey]?: Slot | null }

export interface ShopItem {
  key: string
  name: string
  amount?: number
  unit?: string
  count: number
  needed: boolean
  manual?: boolean
}
/** The shopping list itself is derived live from the week plan; this only stores the household's changes. */
export interface ShoppingDraft extends Synced {
  /** Day key "2026-w44/0" → included or not; missing = default (the next 7 days). */
  dayChoice?: Record<string, boolean>
  /** Item keys unchecked ("already at home"). */
  excluded?: string[]
  /** Item keys already handed to Bring!. */
  sent?: string[]
  // shortcut: each array merges as one field (concurrent offline edits: one side wins), split per item if that bites.
  extra?: ShopItem[]
  handedOverAt?: string
  handedOverBy?: string
}

export interface Photo {
  path: string
  blob: Blob
  _dirty: 0 | 1
}

class DishcoveryDb extends Dexie {
  dishes!: Table<Dish, string>
  weeks!: Table<Week, string>
  misc!: Table<ShoppingDraft, string>
  photos!: Table<Photo, string>
  meta!: Table<{ key: string; value: unknown }, string>

  constructor() {
    super('dishcovery')
    this.version(1).stores({
      dishes: 'id, _dirty',
      weeks: 'id, _dirty',
      misc: 'id, _dirty',
      photos: 'path, _dirty',
      meta: 'key',
    })
  }
}

export const db = new DishcoveryDb()

/** Synced tables; the table name is also the Dropbox subfolder. */
export const syncedTables = ['dishes', 'weeks', 'misc'] as const
export type SyncedTable = (typeof syncedTables)[number]

export const SHOPPING_ID = 'einkauf'

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value })

let onChange = () => {}
export const setOnLocalChange = (fn: () => void) => (onChange = fn)

/** The only way to write synced data: stamps every patched field and marks the record dirty. */
export async function save<T extends Synced>(table: Table<T, string>, id: string, patch: Partial<T>) {
  const now = Date.now()
  await db.transaction('rw', table, async () => {
    const cur = await table.get(id)
    const _ts = { ...cur?._ts }
    for (const k of Object.keys(patch)) _ts[k] = now
    await table.put({ ...cur, ...patch, id, _ts, _dirty: 1 } as T)
  })
  onChange()
}
