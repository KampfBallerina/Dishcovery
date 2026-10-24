import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, save, type Dish, type Ingredient, type SlotKey, type Week } from '../db'
import { locale, t } from '../i18n'
import { fmtAmount } from '../logic/shopping'
import { addDays, mondayOf, openDays, shiftWeek, visibleSlots, weekId } from '../logic/week'
import { Icon, Plate, Sheet, TopBar, toast } from './components'
import { useDishes } from './data'

export const scaled = (i: Ingredient, factor: number) =>
  [i.amount != null && fmtAmount(i.amount * factor), i.unit].filter(Boolean).join(' ')

export function DishDetail({ id }: { id: string }) {
  const dish = useLiveQuery(() => db.dishes.get(id), [id])
  const [servings, setServings] = useState<number>()
  const [planning, setPlanning] = useState(false)
  // The small title appears once the big one has scrolled under the top bar.
  const [titleShown, setTitleShown] = useState(false)
  const heroTitle = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const el = heroTitle.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setTitleShown(!e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [!!dish])
  if (dish === undefined) return null
  if (!dish || dish.deleted) return <TopBar title={t('dishes.gone')} back="#/gerichte" />

  const n = servings ?? dish.servings
  const factor = n / (dish.servings || 1)
  const edited = Math.max(0, ...Object.values(dish._ts))

  return (
    <article className={'detail' + (titleShown ? ' title-shown' : '')}>
      <TopBar title={dish.name} back="#/gerichte">
        <button className="icon-btn" onClick={() => save(db.dishes, id, { favorite: !dish.favorite })} aria-pressed={dish.favorite} aria-label={t('dishes.favorite')}>
          <span className={dish.favorite ? 'fav' : undefined}><Icon name="heart" /></span>
        </button>
        <a className="icon-btn" href={`#/gerichte/${id}/bearbeiten`} aria-label={t('common.edit')}>
          <Icon name="edit" />
        </a>
      </TopBar>

      <div className="detail-hero">
        <Plate dish={dish} size={220} />
        <h1 ref={heroTitle}>{dish.name}</h1>
        {(dish.minutes || dish.tags.length > 0) && (
          <p className="muted">{[dish.minutes && t('dishes.minutes', { n: dish.minutes }), ...dish.tags].filter(Boolean).join(', ')}</p>
        )}
        <div className="detail-actions">
          {dish.steps.length > 0 && (
            <a className="btn primary" href={`#/gerichte/${id}/kochen/${n}`}>
              <Icon name="play" /> {t('cook.start')}
            </a>
          )}
          <button className="btn" onClick={() => setPlanning(true)}>
            <Icon name="week" /> {t('dishes.plan')}
          </button>
          {dish.videoUrl && (
            <a className="btn" href={dish.videoUrl} target="_blank" rel="noreferrer">
              <Icon name="video" /> {t('dishes.video')}
            </a>
          )}
          {dish.sourceUrl && (
            <a className="btn" href={dish.sourceUrl} target="_blank" rel="noreferrer">
              <Icon name="link" /> {t('dishes.source')}
            </a>
          )}
        </div>
      </div>

      {dish.ingredients.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('dishes.ingredients')}</h2>
            <div className="stepper" role="group" aria-label={t('dishes.servings')}>
              <button className="icon-btn" onClick={() => setServings(Math.max(1, n - 1))} aria-label={t('dishes.lessServings')}><Icon name="minus" size={18} /></button>
              <span>{t('dishes.servingsN', { n })}</span>
              <button className="icon-btn" onClick={() => setServings(n + 1)} aria-label={t('dishes.moreServings')}><Icon name="plus" size={18} /></button>
            </div>
          </div>
          <ul className="ingredients">
            {dish.ingredients.map((i, k) => (
              <li key={k}>
                <span className="qty">{scaled(i, factor)}</span>
                <span>{i.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dish.steps.length > 0 && (
        <section>
          <h2>{t('dishes.steps')}</h2>
          <ol className="steps">
            {dish.steps.map((s, k) => <li key={k}>{s}</li>)}
          </ol>
        </section>
      )}

      {dish.notes && (
        <section>
          <h2>{t('dishes.notes')}</h2>
          <p className="notes">{dish.notes}</p>
        </section>
      )}

      {edited > 0 && (
        <p className="muted small edited">
          {t(dish.updatedBy ? 'dishes.editedBy' : 'dishes.edited', {
            name: dish.updatedBy ?? '',
            date: new Date(edited).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
          })}
        </p>
      )}
      {planning && <PlanSheet dish={dish} onClose={() => setPlanning(false)} />}
    </article>
  )
}

/** Upcoming slots of this and next week; picking one plans the dish there, decided like any hand pick. */
function PlanSheet({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const current = weekId(new Date())
  const ids = [current, shiftWeek(current, 1)]
  const weeks = useLiveQuery(() => db.weeks.bulkGet(ids), [current])
  const dishes = useDishes()
  if (!weeks || !dishes) return null
  const byId = new Map(dishes.map((d) => [d.id, d]))

  const slots = ids.flatMap((wid, w) => visibleSlots(weeks[w], openDays(wid)).map((k) => ({ wid, k, other: byId.get(weeks[w]?.[k]?.dishId ?? '') })))
  const label = (wid: string, k: SlotKey) =>
    `${addDays(mondayOf(wid), Number(k[0])).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'numeric' })}, ${t(`meal.${k.split('-')[1]}`)}`
  const plan = async (wid: string, k: SlotKey) => {
    await save(db.weeks, wid, { [k]: { dishId: dish.id, locked: true } } as Partial<Week>)
    toast(t('dishes.planned', { slot: label(wid, k) }))
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={t('dishes.planTitle', { name: dish.name })}>
      <ul className="pick-list">
        {slots.map(({ wid, k, other }) => (
          <li key={wid + k}>
            <button onClick={() => plan(wid, k)}>
              <Plate dish={other} size={44} />
              <span className="pick-text">
                <span>{label(wid, k)}</span>
                <small>{other?.name ?? t('week.open')}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
