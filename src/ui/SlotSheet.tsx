import { useState } from 'react'
import { db, save, type Dish, type SlotKey, type Week } from '../db'
import { t } from '../i18n'
import { reroll, suggest, type Answers } from '../logic/planner'
import { visibleSlots } from '../logic/week'
import { Chip, Icon, Plate, Sheet } from './components'
import { knownIngredients, useLastEaten } from './data'

interface Props {
  weekId: string
  week?: Week
  slot: SlotKey
  dishes: Dish[]
  recent: Set<string>
  startWithAssistant: boolean
  title: string
  onClose: () => void
}

export function SlotSheet({ weekId, week, slot, dishes, recent, startWithAssistant, title, onClose }: Props) {
  const current = week?.[slot]
  const dish = dishes.find((d) => d.id === current?.dishId)
  const [mode, setMode] = useState<'list' | 'assistant'>(startWithAssistant ? 'assistant' : 'list')
  const set = (value: Week[SlotKey]) => save(db.weeks, weekId, { [slot]: value } as Partial<Week>)
  // A hand-picked dish counts as decided, so the dice leave it alone.
  const choose = (d: Dish) => (set({ dishId: d.id, locked: true }), onClose())

  return (
    <Sheet open onClose={onClose} title={title}>
      {dish && (
        <div className="slot-current">
          <Plate dish={dish} size={64} locked={current?.locked} />
          <a href={`#/gerichte/${dish.id}`}>{dish.name}</a>
        </div>
      )}
      <div className="slot-actions">
        <button className="btn" onClick={() => save(db.weeks, weekId, reroll({ ...week!, [slot]: { ...current, locked: false } } as Week, [slot], visibleSlots(week), dishes, recent) as Partial<Week>)} disabled={!dishes.length}>
          <Icon name="dice" /> {t('slot.roll')}
        </button>
        {dish && (
          <button className="btn" onClick={() => set({ dishId: dish.id, locked: !current?.locked })} aria-pressed={current?.locked}>
            <Icon name={current?.locked ? 'lock' : 'unlock'} /> {t(current?.locked ? 'slot.locked' : 'slot.lock')}
          </button>
        )}
        {dish && (
          <button className="btn" onClick={() => set({ dishId: null, locked: false })}>
            <Icon name="close" /> {t('slot.clear')}
          </button>
        )}
        {slot.endsWith('mittag') && (
          <button className="btn" onClick={() => (set(null), onClose())}>
            <Icon name="minus" /> {t('slot.hideLunch')}
          </button>
        )}
      </div>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={mode === 'list'} onClick={() => setMode('list')}>{t('slot.fromList')}</button>
        <button role="tab" aria-selected={mode === 'assistant'} onClick={() => setMode('assistant')}>
          <Icon name="spark" size={16} /> {t('slot.assistant')}
        </button>
      </div>

      {mode === 'list' ? <DishPicker dishes={dishes} onPick={choose} /> : <Assistant dishes={dishes} onPick={choose} />}
    </Sheet>
  )
}

function DishPicker({ dishes, onPick }: { dishes: Dish[]; onPick: (d: Dish) => void }) {
  const [q, setQ] = useState('')
  const hits = dishes.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <label className="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder={t('dishes.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('dishes.search')} />
      </label>
      <DishList dishes={hits} onPick={onPick} />
    </>
  )
}

function DishList({ dishes, onPick, note }: { dishes: Dish[]; onPick: (d: Dish) => void; note?: (d: Dish) => string }) {
  return (
    <ul className="pick-list">
      {dishes.map((d) => (
        <li key={d.id}>
          <button onClick={() => onPick(d)}>
            <Plate dish={d} size={44} />
            <span className="pick-text">
              <span>{d.name}</span>
              {note?.(d) && <small>{note(d)}</small>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

const choices = {
  maxMinutes: [20, 40],
  mood: ['leicht', 'deftig'],
  diet: ['vegetarisch', 'fleisch'],
  novelty: ['neu', 'klassiker'],
} as const

function Assistant({ dishes, onPick }: { dishes: Dish[]; onPick: (d: Dish) => void }) {
  const [a, setA] = useState<Answers>({ have: [] })
  const [q, setQ] = useState('')
  const [allIngredients, setAll] = useState(false)
  const lastEaten = useLastEaten()
  const ingredients = knownIngredients(dishes)
  const shown = q ? ingredients.filter((i) => i.toLowerCase().includes(q.toLowerCase())) : allIngredients ? ingredients : ingredients.slice(0, 16)
  const results = suggest(dishes, a, lastEaten).slice(0, 6)
  const toggle = <K extends keyof typeof choices>(k: K, v: Answers[K]) => setA({ ...a, [k]: a[k] === v ? undefined : v })
  const have = new Set(a.have.map((h) => h.toLowerCase()))

  return (
    <div className="assistant">
      <fieldset>
        <legend>{t('assistant.have')}</legend>
        <input type="search" className="mini-search" placeholder={t('assistant.findIngredient')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('assistant.findIngredient')} />
        <div className="chips">
          {[...new Set([...a.have, ...shown])].map((i) => (
            <Chip key={i} on={a.have.includes(i)} onClick={() => setA({ ...a, have: a.have.includes(i) ? a.have.filter((x) => x !== i) : [...a.have, i] })}>
              {i}
            </Chip>
          ))}
          {!q && !allIngredients && ingredients.length > 16 && (
            <button type="button" className="chip more" onClick={() => setAll(true)}>{t('assistant.more', { n: ingredients.length - 16 })}</button>
          )}
        </div>
      </fieldset>
      {(Object.keys(choices) as (keyof typeof choices)[]).map((k) => (
        <fieldset key={k}>
          <legend>{t(`assistant.${k}`)}</legend>
          <div className="chips">
            {choices[k].map((v) => (
              <Chip key={v} on={a[k] === v} onClick={() => toggle(k, v as never)}>
                {t(`assistant.${k}_${v}`)}
              </Chip>
            ))}
          </div>
        </fieldset>
      ))}
      <h3 className="assistant-result">{t('assistant.result')}</h3>
      {results.length ? (
        <DishList
          dishes={results}
          onPick={onPick}
          note={(d) => {
            const n = d.ingredients.filter((i) => have.has(i.name.toLowerCase())).length
            return have.size && d.ingredients.length ? t('assistant.matches', { n, total: d.ingredients.length }) : d.minutes ? t('dishes.minutes', { n: d.minutes }) : ''
          }}
        />
      ) : (
        <p className="muted">{t('assistant.nothing')}</p>
      )}
    </div>
  )
}
