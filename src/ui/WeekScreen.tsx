import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, save, type SlotKey, type Week } from '../db'
import { locale, t } from '../i18n'
import { reroll } from '../logic/planner'
import { addDays, dishIdsOf, isoDate, mondayOf, shiftWeek, slotKey, visibleSlots, weekId } from '../logic/week'
import { Icon, Plate, SettingsLink } from './components'
import { SlotSheet } from './SlotSheet'
import { useDishes } from './data'

export function WeekScreen() {
  const current = weekId(new Date())
  const [id, setId] = useState(current)
  const week = useLiveQuery(() => db.weeks.get(id), [id])
  const prev = useLiveQuery(() => db.weeks.get(shiftWeek(id, -1)), [id])
  const dishes = useDishes() ?? []
  const byId = new Map(dishes.map((d) => [d.id, d]))
  const [target, setTarget] = useState<SlotKey>()
  const [assistant, setAssistant] = useState(false)

  const monday = mondayOf(id)
  const today = isoDate(new Date())
  const offset = id === current ? 0 : id < current ? -1 : 1
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(locale, o)
  const sunday = addDays(monday, 6)
  const range =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()}.–${fmt(sunday, { day: 'numeric', month: 'long' })}`
      : `${fmt(monday, { day: 'numeric', month: 'short' })} – ${fmt(sunday, { day: 'numeric', month: 'short' })}`

  const recent = new Set(dishIdsOf(prev))
  const roll = (keys: SlotKey[]) => {
    const patch = reroll(week, keys, visibleSlots(week), dishes, recent)
    if (Object.keys(patch).length) save(db.weeks, id, patch as Partial<Week>)
  }

  // The assistant fills the first open slot from today on, else today's dinner.
  const openAssistant = () => {
    const upcoming = visibleSlots(week).filter((k) => isoDate(addDays(monday, Number(k[0]))) >= today || offset > 0)
    setTarget(upcoming.find((k) => !byId.has(week?.[k]?.dishId ?? '')) ?? upcoming[0] ?? slotKey(0, 'abend'))
    setAssistant(true)
  }

  return (
    <>
      <header className="week-head">
        <div className="week-nav">
          <button className="icon-btn on-tomato" disabled={offset < 0} onClick={() => setId(shiftWeek(id, -1))} aria-label={t('week.previous')}>
            <Icon name="back" />
          </button>
          <div className="week-title">
            <h1>{t(offset < 0 ? 'week.last' : offset > 0 ? 'week.next' : 'week.this')}</h1>
            <p>{range}</p>
          </div>
          <button className="icon-btn on-tomato" disabled={offset > 0} onClick={() => setId(shiftWeek(id, 1))} aria-label={t('week.nextAria')}>
            <Icon name="forward" />
          </button>
          <SettingsLink light />
        </div>
        <div className="week-actions">
          <button className="btn on-tomato-solid" onClick={() => roll(visibleSlots(week))} disabled={!dishes.length}>
            <Icon name="dice" /> {t('week.rollWeek')}
          </button>
          <button className="btn on-tomato-ghost" onClick={openAssistant} disabled={!dishes.length}>
            <Icon name="spark" /> {t('week.whatToEat')}
          </button>
        </div>
      </header>

      {!dishes.length && (
        <p className="empty-hint">
          {t('week.noDishes')} <a href="#/gerichte/neu">{t('dishes.new')}</a>
        </p>
      )}

      <ol className="days">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const date = addDays(monday, d)
          const lunch = week?.[slotKey(d, 'mittag')]
          const meals = lunch ? (['mittag', 'abend'] as const) : (['abend'] as const)
          return (
            <li key={d} className={'day' + (isoDate(date) === today ? ' today' : '')}>
              <div className="day-name">
                <span className="dn">{fmt(date, { weekday: 'short' }).replace('.', '')}</span>
                <span className="dd">{date.getDate()}.</span>
              </div>
              <div className="day-slots">
                {meals.map((m) => {
                  const k = slotKey(d, m)
                  const slot = week?.[k]
                  const dish = byId.get(slot?.dishId ?? '')
                  return (
                    <button key={m} className="slot" onClick={() => (setTarget(k), setAssistant(false))}>
                      <Plate dish={dish} size={52} locked={!!dish && slot?.locked} />
                      <span className="slot-text">
                        {lunch && <span className="slot-meal">{t(`meal.${m}`)}</span>}
                        <span className={dish ? 'slot-dish' : 'slot-open'}>{dish?.name ?? t('week.open')}</span>
                      </span>
                    </button>
                  )
                })}
                {!lunch && (
                  <button className="add-lunch" onClick={() => save(db.weeks, id, { [slotKey(d, 'mittag')]: { dishId: null, locked: false } } as Partial<Week>)}>
                    <Icon name="plus" size={16} /> {t('meal.mittag')}
                  </button>
                )}
              </div>
              <button className="icon-btn" onClick={() => roll(visibleSlots(week, [d]))} disabled={!dishes.length} aria-label={t('week.rollDay', { day: fmt(date, { weekday: 'long' }) })}>
                <Icon name="dice" />
              </button>
            </li>
          )
        })}
      </ol>

      {target && (
        <SlotSheet
          weekId={id}
          week={week}
          slot={target}
          dishes={dishes}
          recent={recent}
          startWithAssistant={assistant}
          title={`${fmt(addDays(monday, Number(target[0])), { weekday: 'long' })}, ${t(`meal.${target.split('-')[1]}`)}`}
          onClose={() => setTarget(undefined)}
        />
      )}
    </>
  )
}
