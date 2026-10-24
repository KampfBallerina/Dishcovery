import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getMeta, save, SHOPPING_ID, type ShoppingDraft, type ShopItem } from '../db'
import { locale, t } from '../i18n'
import { afterSend, itemLabel, itemSpec, shoppingList, toText } from '../logic/shopping'
import { addDays, isoDate, mondayOf, shiftWeek, visibleSlots, weekId } from '../logic/week'
import { prepareForBring } from '../sync/bring'
import { Chip, EmptyState, Icon, TopBar, toast } from './components'
import { useDishes } from './data'

const update = (patch: Partial<ShoppingDraft>) => save(db.misc, SHOPPING_ID, patch)

export function ShoppingScreen() {
  const draft = useLiveQuery(async () => (await db.misc.get(SHOPPING_ID)) ?? ({} as ShoppingDraft))
  const dishes = useDishes()
  const thisWeek = weekId(new Date())
  const weekIds = [thisWeek, shiftWeek(thisWeek, 1)]
  const weeks = useLiveQuery(() => db.weeks.bulkGet(weekIds), [thisWeek])
  const root = useLiveQuery(async () => (await getMeta<string>('root')) ?? '')
  const [extra, setExtra] = useState('')
  const [link, setLink] = useState<string>()
  const [preparing, setPreparing] = useState(false)

  // Every day from today to the end of next week that has something planned; by default the next 7 days count.
  const byId = new Map((dishes ?? []).map((d) => [d.id, d]))
  const today = isoDate(new Date())
  const soon = isoDate(addDays(new Date(), 7))
  const days = weekIds.flatMap((id, w) =>
    [0, 1, 2, 3, 4, 5, 6].flatMap((d) => {
      const date = addDays(mondayOf(id), d)
      const planned = visibleSlots(weeks?.[w], [d]).flatMap((k) => byId.get(weeks?.[w]?.[k]?.dishId ?? '') ?? [])
      const key = `${id}/${d}`
      const iso = isoDate(date)
      return iso >= today && planned.length ? [{ key, date, planned, on: draft?.dayChoice?.[key] ?? iso < soon }] : []
    }),
  )
  const { open, sent } = shoppingList(days.filter((d) => d.on).flatMap((d) => d.planned), draft)
  const needed = open.filter((i) => i.needed)

  // The Bring! link is prepared in the background, so one tap opens Bring! directly (iOS needs a real link tap).
  const neededKey = JSON.stringify(needed.map((i) => [i.name, itemSpec(i)]))
  useEffect(() => {
    setLink(undefined)
    if (!root || !needed.length || !navigator.onLine) return setPreparing(false)
    let current = true
    setPreparing(true)
    const timer = setTimeout(() => {
      const name = t('shopping.bringListName', { date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })
      prepareForBring(needed, name, itemSpec)
        .then((l) => current && setLink(l))
        .catch((e) => (console.error(e), current && toast(t('shopping.bringFailed'))))
        .finally(() => current && setPreparing(false))
    }, 600)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [neededKey, root])

  if (!draft || !dishes || !weeks || root === undefined) return <TopBar title={t('shopping.title')} />

  const markSent = async () =>
    update({ ...afterSend(open, [...open, ...sent], draft), handedOverAt: new Date().toISOString(), handedOverBy: await getMeta<string>('userName') })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toText(needed))
    } catch {
      return toast(t('shopping.copyFailed'))
    }
    await markSent()
    toast(t('shopping.copiedToast'))
  }

  const toggle = (i: ShopItem) =>
    sent.includes(i)
      ? update({ sent: (draft.sent ?? []).filter((k) => k !== i.key) })
      : update({ excluded: i.needed ? [...(draft.excluded ?? []), i.key] : (draft.excluded ?? []).filter((k) => k !== i.key) })

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!extra.trim()) return
    update({ extra: [...(draft.extra ?? []), { key: `manuell-${crypto.randomUUID()}`, name: extra.trim(), count: 1, needed: true, manual: true }] })
    setExtra('')
  }

  if (!days.length && !draft.extra?.length)
    return (
      <>
        <TopBar title={t('shopping.title')} />
        <EmptyState icon="cart" title={t('shopping.emptyTitle')} text={t('shopping.nothingPlanned')}>
          <a className="btn primary" href="#/woche">
            <Icon name="week" /> {t('shopping.planWeek')}
          </a>
        </EmptyState>
      </>
    )

  const row = (i: ShopItem) => (
    <li key={i.key}>
      <label>
        <input type="checkbox" checked={i.needed} onChange={() => toggle(i)} />
        <span className={i.needed ? undefined : 'struck'}>{itemLabel(i)}</span>
      </label>
      {i.manual && (
        <button className="icon-btn" onClick={() => update({ extra: draft.extra!.filter((x) => x.key !== i.key) })} aria-label={t('shopping.removeItem', { name: i.name })}>
          <Icon name="close" size={18} />
        </button>
      )}
    </li>
  )

  return (
    <>
      <TopBar title={t('shopping.title')} />
      <div className="page shopping">
        {days.length > 0 && (
          <div className="chips scroll" role="group" aria-label={t('shopping.days')}>
            {days.map((d) => (
              <Chip key={d.key} on={d.on} onClick={() => update({ dayChoice: { ...draft.dayChoice, [d.key]: !d.on } })}>
                {d.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}
              </Chip>
            ))}
          </div>
        )}
        <p className="lead">{t('shopping.liveHint')}</p>

        <ul className="shop-list">{open.map(row)}</ul>
        <form className="add-item" onSubmit={add}>
          <input placeholder={t('shopping.addPlaceholder')} value={extra} onChange={(e) => setExtra(e.target.value)} aria-label={t('shopping.addPlaceholder')} />
          <button className="icon-btn" type="submit" aria-label={t('shopping.add')}><Icon name="plus" /></button>
        </form>

        <div className="draft-actions">
          {root ? (
            link && !preparing ? (
              <a className="btn primary wide big" href={link} target="_blank" rel="noreferrer" onClick={() => markSent().then(() => toast(t('shopping.sentToast')))}>
                <Icon name="cart" /> {t('shopping.toBring', { n: needed.length })}
              </a>
            ) : (
              <button className="btn primary wide big" disabled>
                <Icon name="cart" /> {t(!needed.length ? 'shopping.nothingNew' : preparing ? 'shopping.preparing' : 'shopping.offline')}
              </button>
            )
          ) : (
            <button className="btn primary wide big" onClick={copy} disabled={!needed.length}>
              <Icon name="cart" /> {t(needed.length ? 'shopping.copyForBring' : 'shopping.nothingNew', { n: needed.length })}
            </button>
          )}
          {root ? (
            needed.length > 0 && <button className="btn small" onClick={copy}>{t('shopping.copyInstead')}</button>
          ) : (
            needed.length > 0 && <p className="muted small center">{t('shopping.pasteHint')}</p>
          )}
          {draft.handedOverAt && (
            <p className="muted small center">
              {t(draft.handedOverBy ? 'shopping.lastSentBy' : 'shopping.lastSent', {
                name: draft.handedOverBy ?? '',
                date: new Date(draft.handedOverAt).toLocaleString(locale, { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
              })}
            </p>
          )}
        </div>

        {sent.length > 0 && (
          <section className="sent">
            <h2>{t('shopping.sentTitle')}</h2>
            <p className="muted small">{t('shopping.sentHint')}</p>
            <ul className="shop-list">{sent.map(row)}</ul>
          </section>
        )}
      </div>
    </>
  )
}
