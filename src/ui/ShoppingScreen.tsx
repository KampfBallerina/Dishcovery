import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getMeta, save, SHOPPING_ID, type ShoppingDraft, type ShopItem } from '../db'
import { locale, t } from '../i18n'
import { collect, itemLabel, toText } from '../logic/shopping'
import { addDays, isoDate, mondayOf, shiftWeek, visibleSlots, weekId } from '../logic/week'
import { EmptyState, Icon, TopBar, toast } from './components'
import { useDishes } from './data'

const update = (patch: Partial<ShoppingDraft>) => save(db.misc, SHOPPING_ID, patch)

export function ShoppingScreen() {
  const draft = useLiveQuery(() => db.misc.get(SHOPPING_ID))
  const [fresh, setFresh] = useState(false)
  const active = draft && !draft.deleted && !fresh

  return (
    <>
      <TopBar title={t('shopping.title')} />
      {active ? <Draft draft={draft} onNew={() => setFresh(true)} /> : <Generator onDone={() => setFresh(false)} />}
    </>
  )
}

function Generator({ onDone }: { onDone: () => void }) {
  const dishes = useDishes() ?? []
  const byId = new Map(dishes.map((d) => [d.id, d]))
  const thisWeek = weekId(new Date())
  const ids = [thisWeek, shiftWeek(thisWeek, 1)]
  const weeks = useLiveQuery(() => db.weeks.bulkGet(ids), [thisWeek]) ?? []
  const today = isoDate(new Date())

  // Every day from today to the end of next week that has something planned; the next 7 days are preselected.
  const days = ids.flatMap((id, w) =>
    [0, 1, 2, 3, 4, 5, 6].flatMap((d) => {
      const date = addDays(mondayOf(id), d)
      const planned = visibleSlots(weeks[w], [d]).flatMap((k) => byId.get(weeks[w]?.[k]?.dishId ?? '') ?? [])
      return isoDate(date) >= today && planned.length ? [{ key: `${id}/${d}`, date, planned, soon: isoDate(date) < isoDate(addDays(new Date(), 7)) }] : []
    }),
  )
  const [picked, setPicked] = useState<Set<string>>()
  const selected = picked ?? new Set(days.filter((d) => d.soon).map((d) => d.key))

  const create = async () => {
    const items = collect(days.filter((d) => selected.has(d.key)).flatMap((d) => d.planned))
    await update({ items, createdBy: await getMeta<string>('userName'), handedOverAt: undefined, handedOverBy: undefined, deleted: false })
    onDone()
  }

  if (!days.length)
    return (
      <EmptyState icon="cart" title={t('shopping.emptyTitle')} text={t('shopping.nothingPlanned')}>
        <a className="btn primary" href="#/woche">
          <Icon name="week" /> {t('shopping.planWeek')}
        </a>
      </EmptyState>
    )

  return (
    <div className="generator">
      <p className="lead">{t('shopping.pickDays')}</p>
      <ul className="day-picks">
        {days.map((d) => (
          <li key={d.key}>
            <label>
              <input type="checkbox" checked={selected.has(d.key)} onChange={() => {
                const next = new Set(selected)
                if (!next.delete(d.key)) next.add(d.key)
                setPicked(next)
              }} />
              <span className="day-pick-date">{d.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
              <span className="day-pick-dishes">{d.planned.map((p) => p.name).join(', ')}</span>
            </label>
          </li>
        ))}
      </ul>
      <button className="btn primary wide" onClick={create} disabled={!selected.size}>
        <Icon name="cart" /> {t('shopping.create')}
      </button>
    </div>
  )
}

function Draft({ draft, onNew }: { draft: ShoppingDraft; onNew: () => void }) {
  const [extra, setExtra] = useState('')
  const done = !!draft.handedOverAt
  const setItem = (key: string, patch: Partial<ShopItem>) => update({ items: draft.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) })

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!extra.trim()) return
    update({ items: [...draft.items, { key: `manuell-${crypto.randomUUID()}`, name: extra.trim(), count: 1, needed: true, manual: true }] })
    setExtra('')
  }

  const handOver = async (how: 'share' | 'copy') => {
    const text = toText(draft.items)
    try {
      if (how === 'share') await navigator.share({ title: t('shopping.title'), text })
      else await navigator.clipboard.writeText(text)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return // share sheet dismissed: nothing was handed over
      throw e
    }
    await update({ handedOverAt: new Date().toISOString(), handedOverBy: await getMeta<string>('userName') })
    toast(t(how === 'copy' ? 'shopping.copiedToast' : 'shopping.handedOverToast'))
  }

  const needed = draft.items.filter((i) => i.needed).length

  return (
    <div className={'draft' + (done ? ' done' : '')}>
      {done ? (
        <div className="banner ok">
          <Icon name="check" />
          <p>
            {t(draft.handedOverBy ? 'shopping.handedOverBy' : 'shopping.handedOver', {
              name: draft.handedOverBy ?? '',
              date: new Date(draft.handedOverAt!).toLocaleString(locale, { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
            })}
          </p>
          <button className="btn small" onClick={() => update({ handedOverAt: undefined, handedOverBy: undefined })}>{t('shopping.undo')}</button>
        </div>
      ) : (
        <p className="lead">{t('shopping.draftHint')}</p>
      )}

      <ul className="shop-list">
        {draft.items.map((i) => (
          <li key={i.key}>
            <label>
              <input type="checkbox" checked={i.needed} disabled={done} onChange={() => setItem(i.key, { needed: !i.needed })} />
              <span className={i.needed ? undefined : 'struck'}>{itemLabel(i)}</span>
            </label>
          </li>
        ))}
      </ul>

      {!done && (
        <form className="add-item" onSubmit={add}>
          <input placeholder={t('shopping.addPlaceholder')} value={extra} onChange={(e) => setExtra(e.target.value)} aria-label={t('shopping.addPlaceholder')} />
          <button className="icon-btn" type="submit" aria-label={t('shopping.add')}><Icon name="plus" /></button>
        </form>
      )}

      <div className="draft-actions">
        {!done && (
          <>
            {'share' in navigator && (
              <button className="btn primary wide" onClick={() => handOver('share')} disabled={!needed}>
                <Icon name="share" /> {t('shopping.toBring', { n: needed })}
              </button>
            )}
            <button className="btn wide" onClick={() => handOver('copy')} disabled={!needed}>
              {t('shopping.copy')}
            </button>
          </>
        )}
        <div className="draft-secondary">
          <button className="btn small" onClick={onNew}><Icon name="plus" size={18} /> {t('shopping.new')}</button>
          {!done && <button className="btn small" onClick={() => confirm(t('shopping.discardConfirm')) && update({ deleted: true })}><Icon name="trash" size={18} /> {t('shopping.discard')}</button>}
        </div>
      </div>
    </div>
  )
}
