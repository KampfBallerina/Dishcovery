import { DROPBOX_APP_KEY } from '../config'
import { getMeta, setMeta, db } from '../db'

interface Auth {
  refreshToken: string
  accessToken: string
  expiresAt: number
}

export class DropboxError extends Error {
  constructor(public status: number, public body: string) {
    super(`Dropbox ${status}: ${body}`)
  }
  get conflict() {
    return this.status === 409 && this.body.includes('conflict')
  }
}

const redirectUri = () => location.origin + import.meta.env.BASE_URL
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function startLogin() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  // In IndexedDB, not sessionStorage: iOS may return from the login into a fresh browsing context.
  await setMeta('pkce', verifier)
  location.href =
    'https://www.dropbox.com/oauth2/authorize?' +
    new URLSearchParams({
      client_id: DROPBOX_APP_KEY,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri(),
      token_access_type: 'offline',
    })
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: DROPBOX_APP_KEY, ...params }),
  })
  if (!res.ok) throw new DropboxError(res.status, await res.text())
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
}

/** Called on startup: finishes the login if Dropbox redirected back with ?code=. */
export async function finishLogin() {
  const code = new URLSearchParams(location.search).get('code')
  if (!code) return
  history.replaceState(null, '', redirectUri())
  const verifier = await getMeta<string>('pkce')
  if (!verifier) return
  const r = await tokenRequest({ code, grant_type: 'authorization_code', code_verifier: verifier, redirect_uri: redirectUri() })
  await setMeta('auth', { refreshToken: r.refresh_token!, accessToken: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 } satisfies Auth)
  await db.meta.delete('pkce')
  const me = await rpc<{ name: { display_name: string } }>('users/get_current_account', null)
  await setMeta('userName', me.name.display_name)
}

export async function logout() {
  await db.meta.bulkDelete(['auth', 'userName', 'root', 'cursor'])
}

async function token() {
  const auth = await getMeta<Auth>('auth')
  if (!auth) throw new Error('not-logged-in')
  if (auth.expiresAt - 60000 > Date.now()) return auth.accessToken
  const r = await tokenRequest({ grant_type: 'refresh_token', refresh_token: auth.refreshToken })
  await setMeta('auth', { ...auth, accessToken: r.access_token, expiresAt: Date.now() + r.expires_in * 1000 })
  return r.access_token
}

/** Dropbox-API-Arg must be ASCII, so non-ASCII (umlauts in folder names) is \u-escaped. */
const headerArg = (arg: unknown) => JSON.stringify(arg).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))

export async function rpc<T>(endpoint: string, arg: unknown): Promise<T> {
  const res = await fetch('https://api.dropboxapi.com/2/' + endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (await token()), ...(arg !== null && { 'Content-Type': 'application/json' }) },
    body: arg === null ? undefined : JSON.stringify(arg),
  })
  if (!res.ok) throw new DropboxError(res.status, await res.text())
  return res.json()
}

export async function download(path: string): Promise<Blob> {
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (await token()), 'Dropbox-API-Arg': headerArg({ path }) },
  })
  if (!res.ok) throw new DropboxError(res.status, await res.text())
  return res.blob()
}

/** Upload with optimistic locking: pass the known rev, or none to only create. Throws a conflict otherwise. */
export async function upload(path: string, body: Blob | string, rev?: string): Promise<{ rev: string }> {
  const mode = rev ? { '.tag': 'update', update: rev } : 'add'
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (await token()),
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': headerArg({ path, mode, autorename: false, mute: true }),
    },
    body,
  })
  if (!res.ok) throw new DropboxError(res.status, await res.text())
  return res.json()
}

export interface Entry {
  '.tag': 'file' | 'folder' | 'deleted'
  name: string
  path_lower: string
  path_display: string
  rev?: string
}
export interface ListResult {
  entries: Entry[]
  cursor: string
  has_more: boolean
}
