import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DROPBOX_APP_KEY } from '../config'
import { db, type Dish } from '../db'
import { locale, t } from '../i18n'
import { DropboxError, startLogin } from '../sync/dropbox'
import { disconnect, inviteMember, joinInvite, listMembers, useHousehold, type Member } from '../sync/household'
import { sync, useSyncStatus } from '../sync/sync'
import { Icon, Plate, TopBar, toast } from './components'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function HouseholdScreen() {
  const meta = useLiveQuery(async () => Object.fromEntries((await db.meta.toArray()).map((m) => [m.key, m.value])))
  const status = useSyncStatus()
  const household = useHousehold()
  const [members, setMembers] = useState<Member[]>()
  const [membersError, setMembersError] = useState<string>()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const root = meta?.root as string | undefined

  const loadMembers = () =>
    listMembers()
      .then((m) => (setMembers(m), setMembersError(undefined)))
      .catch((e) => setMembersError(e instanceof DropboxError && e.missingScope ? 'scope' : navigator.onLine ? 'error' : 'offline'))
  useEffect(() => {
    if (root) loadMembers()
  }, [root])

  if (!meta) return null
  const loggedIn = !!meta.auth

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL.test(address)) return toast(t('household.invalidEmail'))
    setSending(true)
    try {
      await inviteMember(address, t('household.inviteMessage', { name: String(meta.userName ?? '') }))
      setEmail('')
      toast(t('household.invited', { email: address }))
      loadMembers()
    } catch (err) {
      toast(err instanceof DropboxError && err.missingScope ? t('household.reconnectShort') : t('household.inviteFailed'))
    } finally {
      setSending(false)
    }
  }

  const syncLine =
    status.state === 'syncing' ? t('household.syncing')
    : status.state === 'error' ? t('household.syncError')
    : status.lastSync ? t('household.lastSync', { time: new Date(status.lastSync).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })
    : t('household.notYet')

  return (
    <>
      <TopBar title={t('household.title')} back="#/woche" />
      <div className="page">
        {!DROPBOX_APP_KEY ? (
          <p className="banner warn">{t('household.noAppKey')}</p>
        ) : !loggedIn ? (
          <section className="group">
            <p className="lead">{t('household.connectHint')}</p>
            <button className="btn primary wide" onClick={startLogin}>{t('welcome.connect')}</button>
          </section>
        ) : (
          <>
            {(household.reconnect || membersError === 'scope') && (
              <div className="banner warn">
                <p>{t('household.reconnect')}</p>
                <button className="btn small" onClick={startLogin}>{t('household.reconnectButton')}</button>
              </div>
            )}
            {household.invite && (
              <div className="banner ok">
                <p>{t(household.invite.from ? 'invite.textFrom' : 'invite.text', { name: household.invite.from ?? '' })}</p>
                <button className="btn small primary" onClick={() => joinInvite().then(() => toast(t('invite.joined')))}>{t('invite.join')}</button>
              </div>
            )}

            <section className="group">
              <h2>{t('household.members')}</h2>
              {membersError === 'offline' && <p className="muted small">{t('household.membersOffline')}</p>}
              <ul className="members">
                {(members ?? []).map((m) => (
                  <li key={m.email ?? m.name}>
                    <Plate dish={{ name: m.name } as Dish} size={44} />
                    <span className="member-text">
                      <span>{m.name}{m.you && <span className="muted"> {t('household.you')}</span>}</span>
                      {m.pending && <small className="muted">{t('household.pending')}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="group">
              <h2>{t('household.inviteTitle')}</h2>
              <p className="muted small">{t('household.inviteHint')}</p>
              <form className="invite-form" onSubmit={invite}>
                <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder={t('household.emailPlaceholder')}
                  value={email} onChange={(e) => setEmail(e.target.value)} aria-label={t('household.emailPlaceholder')} disabled={!root} />
                <button className="btn primary" disabled={sending || !email.trim() || !root}>
                  <Icon name="mail" size={18} /> {t(sending ? 'household.sending' : 'household.invite')}
                </button>
              </form>
            </section>

            <section className="group">
              <h2>{t('household.syncTitle')}</h2>
              <p className={status.state === 'error' ? 'sync-line error' : 'sync-line'}>{syncLine}</p>
              <p className="muted small">{t('household.account', { name: String(meta.userName ?? '') })}</p>
              <div className="row-actions">
                <button className="btn" onClick={() => sync()} disabled={status.state === 'syncing' || !root}>{t('household.syncNow')}</button>
                <button className="btn danger" onClick={() => confirm(t('household.logoutConfirm')) && disconnect().then(() => toast(t('household.loggedOut')))}>{t('household.logout')}</button>
              </div>
            </section>
          </>
        )}
        <p className="muted small">{t('household.offlineNote')}</p>
      </div>
    </>
  )
}
