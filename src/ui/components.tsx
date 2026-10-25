import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Dish } from '../db'
import { t } from '../i18n'
import { usePhotoUrl } from '../photo'
import { useSyncStatus } from '../sync/sync'
import { goBack } from './App'

const paths = {
  dice: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  unlock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.6-1.8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
  back: <path d="M15 18l-6-6 6-6" />,
  forward: <path d="M9 18l6-6-6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  play: <path d="M7 4.5v15l12-7.5z" />,
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />,
  week: <><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  plate: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /></>,
  cart: <><path d="M3 4h2l2.4 11h11l2-8H6.2" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3z" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
}
export type IconName = keyof typeof paths

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

/** A dish is a plate: photo if there is one, else its initial. No dish = an empty, dashed plate; "Kochfrei" = a clean plate put aside. */
export function Plate({ dish, size = 56, locked, off }: { dish?: Dish; size?: number; locked?: boolean; off?: boolean }) {
  const url = usePhotoUrl(dish?.photo)
  const cls = ['plate', off ? 'off' : !dish && 'empty', locked && 'locked'].filter(Boolean).join(' ')
  return (
    <span className={cls} style={{ '--s': `${size}px` } as CSSProperties} aria-hidden="true">
      {url ? <img src={url} alt="" /> : dish ? <span className="plate-letter">{dish.name.trim()[0]?.toUpperCase()}</span> : null}
      {locked && <span className="plate-lock"><Icon name="lock" size={Math.max(12, size * 0.22)} /></span>}
    </span>
  )
}

/** Empty screen as an invitation: an empty plate (optionally with an icon), one sentence, one action. */
export function EmptyState({ icon, title, text, children }: { icon?: IconName; title: string; text: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="plate empty empty-plate" aria-hidden="true">{icon && <Icon name={icon} size={44} />}</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    // Focus the sheet, not its first button: iOS would ring the close button right away.
    if (open && !d.open) (d.showModal(), d.focus())
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="sheet" tabIndex={-1} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {open && (
        <div className="sheet-inner">
          <header className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** Same header on every screen: back (sub pages) or large title (tabs), actions right, household last. */
export function TopBar({ title, back, children }: { title: string; back?: string; children?: ReactNode }) {
  return (
    <header className={'topbar' + (back ? ' sub' : '')}>
      {back && (
        <a className="icon-btn" href={back} onClick={goBack} aria-label={t('common.back')}>
          <Icon name="back" />
        </a>
      )}
      <h1>{title}</h1>
      <div className="topbar-actions">
        {children}
        {!back && <HouseholdLink />}
      </div>
    </header>
  )
}

/** People icon with a dot when sync needs attention. */
export function HouseholdLink({ light }: { light?: boolean }) {
  const s = useSyncStatus()
  return (
    <a className={'icon-btn' + (light ? ' on-accent' : '')} href="#/haushalt" aria-label={t('household.title')}>
      <Icon name="people" />
      {(s.state === 'error' || s.state === 'off') && <span className="dot" aria-hidden="true" />}
    </a>
  )
}

interface ToastAction { label: string; run: () => void }
let toastListener: (msg: string, action?: ToastAction) => void = () => {}
/** Short confirmation at the bottom, e.g. "Eingeladen"; optionally with one action like "Rückgängig". */
export const toast = (msg: string, action?: ToastAction) => toastListener(msg, action)

export function Toaster() {
  const [current, setCurrent] = useState<{ msg: string; action?: ToastAction }>()
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    toastListener = (msg, action) => {
      setCurrent({ msg, action })
      clearTimeout(timer)
      // An action needs time to be read and reached.
      timer = setTimeout(() => setCurrent(undefined), action ? 5000 : 2600)
    }
    return () => clearTimeout(timer)
  }, [])
  return (
    <div className="toast-slot" role="status" aria-live="polite">
      {current && (
        <div className="toast" key={current.msg}>
          <Icon name="check" size={18} /> {current.msg}
          {current.action && (
            <button className="toast-action" onClick={() => (current.action!.run(), setCurrent(undefined))}>{current.action.label}</button>
          )}
        </div>
      )}
    </div>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}
