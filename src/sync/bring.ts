import { getMeta, type ShopItem } from '../db'
import { DropboxError, rpc, upload, type ListResult } from './dropbox'

/**
 * Bring!'s documented JSON import (bring-import-dev-guide, "Import with JSON File"): Bring! reads a JSON file
 * from an https URL. We put it into the household folder and share it via a Dropbox link. See docs/bring.md.
 */
export async function bringImportUrl(items: ShopItem[], name: string, spec: (i: ShopItem) => string): Promise<string> {
  const root = await getMeta<string>('root')
  if (!root) throw new Error('no-household')
  const dir = `${root}/bring` // outside the synced folders, so the sync never reads it
  try {
    // Only the latest list stays (and with it only one public link).
    for (const e of (await rpc<ListResult>('files/list_folder', { path: dir })).entries)
      await rpc('files/delete_v2', { path: e.path_lower })
  } catch (e) {
    if (!(e instanceof DropboxError && e.status === 409)) throw e // folder doesn't exist yet
  }
  const app = location.origin + import.meta.env.BASE_URL
  const body = {
    author: 'Dishcovery',
    linkOutUrl: app,
    imageUrl: app + 'logo.png',
    name,
    tagline: '',
    yield: '',
    time: '',
    nutrition: {},
    items: items.map((i) => ({ itemId: i.name, spec: spec(i) })),
  }
  // A new file name per hand-over, so Bring! can't serve a cached older list.
  const path = `${dir}/liste-${Date.now()}.json`
  await upload(path, JSON.stringify(body))
  const { url } = await rpc<{ url: string }>('sharing/create_shared_link_with_settings', { path })
  // Raw file instead of Dropbox's preview page. Bring! only treats a URL as JSON import when it ends in ".json"
  // (tested against its parser), and Dropbox links end in "?rlkey=…", so a dummy parameter goes last.
  // shortcut: relies on Dropbox's current link format, try sharing/get_temporary_link if the raw rewrite breaks.
  const raw = new URL(url.replace('://www.dropbox.com/', '://dl.dropboxusercontent.com/'))
  raw.searchParams.delete('dl')
  raw.searchParams.set('f', 'liste.json')
  return raw.toString()
}

export const bringDeeplink = (fileUrl: string) =>
  'https://api.getbring.com/rest/bringrecipes/deeplink?' +
  new URLSearchParams({ url: fileUrl, source: 'web', baseQuantity: '1', requestedQuantity: '1' })
