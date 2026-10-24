import { getMeta, setMeta, type ShopItem } from '../db'
import { DropboxError, rpc, upload } from './dropbox'

/**
 * Bring!'s documented JSON import (bring-import-dev-guide, "Import with JSON File"): Bring! reads a JSON file
 * from an https URL. We put it into the household folder and share it via a Dropbox link. See docs/bring.md.
 */
async function publish(items: ShopItem[], name: string, spec: (i: ShopItem) => string): Promise<string> {
  const root = await getMeta<string>('root')
  if (!root) throw new Error('no-household')
  // Each device only replaces its own previous file, so another phone's prepared link stays valid.
  const previous = await getMeta<string>('bringFile')
  if (previous)
    await rpc('files/delete_v2', { path: previous }).catch((e) => {
      if (!(e instanceof DropboxError && e.status === 409)) throw e
    })
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
  // Outside the synced folders; a new name each time, so Bring! can't serve a cached older list.
  const path = `${root}/bring/liste-${Date.now()}.json`
  await upload(path, JSON.stringify(body))
  await setMeta('bringFile', path)
  const { url } = await rpc<{ url: string }>('sharing/create_shared_link_with_settings', { path })
  // Raw file instead of Dropbox's preview page. Bring! only treats a URL as JSON import when it ends in ".json"
  // (tested against its parser), and Dropbox links end in "?rlkey=…", so a dummy parameter goes last.
  // shortcut: relies on Dropbox's current link format, try sharing/get_temporary_link if the raw rewrite breaks.
  const raw = new URL(url.replace('://www.dropbox.com/', '://dl.dropboxusercontent.com/'))
  raw.searchParams.delete('dl')
  raw.searchParams.set('f', 'liste.json')
  return raw.toString()
}

let queue: Promise<unknown> = Promise.resolve()
/** Uploads one at a time, so quick list edits don't leave orphaned files behind. */
export function prepareForBring(items: ShopItem[], name: string, spec: (i: ShopItem) => string): Promise<string> {
  const run = queue.then(() => publish(items, name, spec))
  queue = run.catch(() => {})
  return run.then(bringDeeplink)
}

/**
 * Builds Bring!'s own app link directly (what its deeplink API redirects to in the end). deeplink.getbring.com is a
 * universal link of the Bring! app, so iOS opens the app without a web page in between.
 */
export function bringDeeplink(fileUrl: string) {
  const parser =
    'https://api.getbring.com/rest/bringrecipes/parser?' +
    new URLSearchParams({ url: fileUrl, baseQuantity: '1', requestedQuantity: '1' })
  return (
    'https://deeplink.getbring.com/import?' +
    new URLSearchParams({ type: 'RECIPE', src: btoa(parser), bring_source: 'importDeeplink', bring_campaign: 'importRecipe' })
  )
}
