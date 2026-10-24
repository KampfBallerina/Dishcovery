import { useSyncExternalStore } from 'react'
import { getMeta, setMeta } from '../db'
import { DropboxError, logout, rpc } from './dropbox'
import { chooseRoot, sync } from './sync'

/** Every household lives in a Dropbox folder with this name; invites are recognised by it. */
// shortcut: a renamed shared folder is no longer recognised as invite, add a marker file if people rename it.
const FOLDER = 'Dishcovery'
const isOurs = (name: string) => name.toLowerCase() === FOLDER.toLowerCase()

interface SharedFolder {
  name: string
  shared_folder_id: string
  path_lower?: string
  owner_display_names?: string[]
}

export interface HouseholdState {
  invite?: { id: string; from?: string; dismissed: boolean }
  /** Token lacks the sharing scopes (connected before they existed): user must log in again. */
  reconnect?: boolean
}

let state: HouseholdState = {}
const listeners = new Set<() => void>()
const setState = (s: HouseholdState) => {
  state = s
  listeners.forEach((l) => l())
}
export const useHousehold = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state)

/** Run after login and on start: offer a pending invite, otherwise make sure a household folder is set. */
export async function checkHousehold() {
  if (!(await getMeta('auth'))) return
  try {
    const { entries } = await rpc<{ entries: SharedFolder[] }>('sharing/list_mountable_folders', { limit: 100 })
    const pending = entries.find((f) => isOurs(f.name) && !f.path_lower)
    const invite = pending && { id: pending.shared_folder_id, from: pending.owner_display_names?.[0], dismissed: pending.shared_folder_id === (await getMeta('inviteDismissed')) }
    setState({ invite })
    // An open invite decides first; only without one (or after "later") the own folder is created.
    if ((!invite || invite.dismissed) && !(await getMeta('root'))) await chooseRoot(await ownFolder())
  } catch (e) {
    if (e instanceof DropboxError && e.missingScope) setState({ reconnect: true })
    else throw e
  }
}

async function ownFolder() {
  const { entries } = await rpc<{ entries: SharedFolder[] }>('sharing/list_folders', { limit: 100 })
  const shared = entries.find((f) => isOurs(f.name) && f.path_lower)
  if (shared) return shared.path_lower!
  try {
    return (await rpc<{ metadata: { path_lower: string } }>('files/create_folder_v2', { path: '/' + FOLDER })).metadata.path_lower
  } catch (e) {
    if (e instanceof DropboxError && e.status === 409) return '/' + FOLDER.toLowerCase() // already there
    throw e
  }
}

/** Mounts the shared folder; local data is merged into it (chooseRoot marks everything for upload). */
export async function joinInvite() {
  const folder = await rpc<SharedFolder>('sharing/mount_folder', { shared_folder_id: state.invite!.id })
  await chooseRoot(folder.path_lower!)
  setState({})
}

export async function disconnect() {
  await logout()
  setState({})
  await sync() // sets the status to "off"
}

export async function dismissInvite() {
  await setMeta('inviteDismissed', state.invite!.id)
  setState({ invite: { ...state.invite!, dismissed: true } })
  if (!(await getMeta('root'))) await chooseRoot(await ownFolder())
}

type ShareJob = { '.tag': 'complete' | 'async_job_id' | 'in_progress' | 'failed'; shared_folder_id?: string; async_job_id?: string }

async function sharedFolderId(createShare: boolean): Promise<string | undefined> {
  const root = await getMeta<string>('root')
  if (!root) throw new Error('no-household')
  const meta = await rpc<{ shared_folder_id?: string; sharing_info?: { shared_folder_id?: string } }>('files/get_metadata', { path: root })
  const id = meta.shared_folder_id ?? meta.sharing_info?.shared_folder_id
  if (id || !createShare) return id
  let job = await rpc<ShareJob>('sharing/share_folder', { path: root })
  const jobId = job.async_job_id
  for (let i = 0; job['.tag'] !== 'complete'; i++) {
    if (job['.tag'] === 'failed' || i > 30) throw new Error('share-failed')
    await new Promise((ok) => setTimeout(ok, 1000))
    job = await rpc<ShareJob>('sharing/check_share_job_status', { async_job_id: jobId })
  }
  return job.shared_folder_id!
}

/** Dropbox emails the invite; the person then only logs in and gets the join prompt. */
export async function inviteMember(email: string, message: string) {
  const id = await sharedFolderId(true)
  await rpc('sharing/add_folder_member', {
    shared_folder_id: id,
    members: [{ member: { '.tag': 'email', email }, access_level: 'editor' }],
    custom_message: message,
  })
}

export interface Member {
  name: string
  email?: string
  pending: boolean
  you: boolean
}

export async function listMembers(): Promise<Member[]> {
  const me = await getMeta<string>('accountId')
  const id = await sharedFolderId(false)
  if (!id) return [{ name: (await getMeta<string>('userName')) ?? '', pending: false, you: true }]
  const r = await rpc<{
    users: { user: { account_id: string; display_name?: string; email?: string } }[]
    invitees: { invitee: { email?: string } }[]
  }>('sharing/list_folder_members', { shared_folder_id: id })
  return [
    ...r.users.map((u) => ({ name: u.user.display_name ?? u.user.email ?? '', email: u.user.email, pending: false, you: u.user.account_id === me })),
    ...r.invitees.map((i) => ({ name: i.invitee.email ?? '', email: i.invitee.email, pending: true, you: false })),
  ]
}
