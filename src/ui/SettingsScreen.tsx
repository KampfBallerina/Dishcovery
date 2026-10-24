import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DROPBOX_APP_KEY } from '../config'
import { db } from '../db'
import { locale, t } from '../i18n'
import { logout, rpc, startLogin, type Entry, type ListResult } from '../sync/dropbox'
import { chooseRoot, sync, useSyncStatus } from '../sync/sync'
import { Icon, TopBar } from './components'

export function SettingsScreen() {
  const meta = useLiveQuery(async () => Object.fromEntries((await db.meta.toArray()).map((m) => [m.key, m.value])))
  const status = useSyncStatus()
  const [picking, setPicking] = useState(false)
  if (!meta) return null
  const loggedIn = !!meta.auth
  const root = meta.root as string | undefined

  return (
    <>
      <TopBar title={t('settings.title')} back="#/woche" />
      <section className="settings">
        <h2>{t('settings.household')}</h2>
        {!DROPBOX_APP_KEY ? (
          <p className="banner warn">{t('settings.noAppKey')}</p>
        ) : !loggedIn ? (
          <>
            <p className="lead">{t('settings.connectHint')}</p>
            <button className="btn primary wide" onClick={startLogin}>{t('settings.connect')}</button>
          </>
        ) : (
          <>
            <dl className="facts">
              <dt>{t('settings.account')}</dt>
              <dd>{String(meta.userName ?? '')}</dd>
              <dt>{t('settings.folder')}</dt>
              <dd>{root ?? t('settings.noFolder')}</dd>
              <dt>{t('settings.sync')}</dt>
              <dd>
                {status.state === 'syncing' ? t('settings.syncing')
                  : status.state === 'error' ? t('settings.syncError', { error: status.error ?? '' })
                  : status.lastSync ? t('settings.lastSync', { time: new Date(status.lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })
                  : root ? t('settings.notYet') : '–'}
              </dd>
            </dl>
            {picking || !root ? (
              <FolderPicker onPick={(p) => (chooseRoot(p), setPicking(false))} />
            ) : (
              <div className="settings-actions">
                <button className="btn primary" onClick={() => sync()} disabled={status.state === 'syncing'}>{t('settings.syncNow')}</button>
                <button className="btn" onClick={() => setPicking(true)}>{t('settings.changeFolder')}</button>
                <button className="btn" onClick={logout}>{t('settings.logout')}</button>
              </div>
            )}
          </>
        )}
        <p className="muted small">{t('settings.offlineNote')}</p>
      </section>
    </>
  )
}

function FolderPicker({ onPick }: { onPick: (path: string) => void }) {
  const [path, setPath] = useState('')
  const [folders, setFolders] = useState<Entry[]>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    setFolders(undefined)
    rpc<ListResult>('files/list_folder', { path })
      .then((r) => setFolders(r.entries.filter((e) => e['.tag'] === 'folder').sort((a, b) => a.name.localeCompare(b.name, locale))))
      .catch((e) => setError(String(e)))
  }, [path])

  const create = async () => {
    const name = prompt(t('settings.newFolderName'), 'Dishcovery')?.trim()
    if (!name) return
    const r = await rpc<{ metadata: Entry }>('files/create_folder_v2', { path: `${path}/${name}`, autorename: false })
    onPick(r.metadata.path_lower)
  }

  return (
    <div className="folder-picker">
      <p className="lead">{t('settings.pickFolder')}</p>
      <div className="folder-path">
        {path && (
          <button className="icon-btn" onClick={() => setPath(path.slice(0, path.lastIndexOf('/')))} aria-label={t('common.back')}>
            <Icon name="back" />
          </button>
        )}
        <span>{path || 'Dropbox'}</span>
      </div>
      {error && <p className="banner warn">{error}</p>}
      <ul className="folders">
        {folders?.map((f) => (
          <li key={f.path_lower}>
            <button onClick={() => setPath(f.path_lower)}>{f.name}<Icon name="forward" size={18} /></button>
          </li>
        ))}
        {folders?.length === 0 && <li className="muted small">{t('settings.emptyFolder')}</li>}
      </ul>
      <div className="settings-actions">
        {path && <button className="btn primary" onClick={() => onPick(path)}>{t('settings.useFolder')}</button>}
        <button className="btn" onClick={create}><Icon name="plus" size={18} /> {t('settings.newFolder')}</button>
      </div>
    </div>
  )
}
