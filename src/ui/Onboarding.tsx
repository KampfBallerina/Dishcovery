import { useState } from 'react'
import { setMeta } from '../db'
import { t } from '../i18n'
import { startLogin } from '../sync/dropbox'
import { disconnect, dismissInvite, joinInvite, useHousehold } from '../sync/household'
import { Icon, Sheet, toast } from './components'

/** First start without Dropbox: one screen, one decision. */
export function Welcome() {
  return (
    <div className="welcome">
      <h1 className="welcome-logo">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dishcovery" width="560" height="471" />
      </h1>
      <div className="welcome-text">
        <p>{t('welcome.text')}</p>
      </div>
      <div className="welcome-actions">
        <button className="btn primary big" onClick={startLogin}>{t('welcome.connect')}</button>
        <button className="btn ghost-light" onClick={() => setMeta('welcomeSkipped', true)}>{t('welcome.skip')}</button>
        <p className="welcome-note">{t('welcome.note')}</p>
      </div>
    </div>
  )
}

/** Join prompt for invited people, or a request to log in again for missing permissions. */
export function HouseholdPrompts() {
  const { invite, reconnect } = useHousehold()
  const [busy, setBusy] = useState(false)

  if (reconnect)
    return (
      <Sheet open title={t('household.reconnectTitle')} onClose={() => {}}>
        <p className="lead">{t('household.reconnect')}</p>
        <div className="stack">
          <button className="btn primary wide big" onClick={startLogin}>{t('household.reconnectButton')}</button>
          <button className="btn wide" onClick={() => disconnect().then(() => toast(t('household.loggedOut')))}>{t('household.logout')}</button>
        </div>
      </Sheet>
    )

  if (!invite || invite.dismissed) return null
  const join = async () => {
    setBusy(true)
    try {
      await joinInvite()
      toast(t('invite.joined'))
    } catch {
      toast(t('invite.failed'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open title={t('invite.title')} onClose={dismissInvite}>
      <div className="invite">
        <span className="invite-icon"><Icon name="people" size={34} /></span>
        <p>{t(invite.from ? 'invite.textFrom' : 'invite.text', { name: invite.from ?? '' })}</p>
        <p className="muted small">{t('invite.merge')}</p>
      </div>
      <div className="stack">
        <button className="btn primary wide big" onClick={join} disabled={busy}>{t(busy ? 'invite.joining' : 'invite.join')}</button>
        <button className="btn wide" onClick={dismissInvite} disabled={busy}>{t('invite.later')}</button>
      </div>
    </Sheet>
  )
}
