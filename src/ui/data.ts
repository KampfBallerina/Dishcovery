import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Dish } from '../db'
import { locale } from '../i18n'
import { ingredientKey } from '../logic/ingredients'
import { addDays, isoDate, mondayOf, visibleSlots } from '../logic/week'

export function useDishes() {
  return useLiveQuery(async () => (await db.dishes.filter((d) => !d.deleted).toArray()).sort((a, b) => a.name.localeCompare(b.name, locale)))
}

/** Last date a dish was on the plan: from dish.lastEaten plus the weeks still stored. */
export function useLastEaten() {
  const weeks = useLiveQuery(() => db.weeks.toArray()) ?? []
  const today = isoDate(new Date())
  const fromWeeks = new Map<string, string>()
  for (const w of weeks)
    for (const k of visibleSlots(w)) {
      const id = w[k]?.dishId
      const date = isoDate(addDays(mondayOf(w.id), Number(k.split('-')[0])))
      if (id && date < today && date > (fromWeeks.get(id) ?? '')) fromWeeks.set(id, date)
    }
  return (d: Dish) => {
    const w = fromWeeks.get(d.id)
    return !d.lastEaten || (w && w > d.lastEaten) ? w : d.lastEaten
  }
}

export const weeksSince = (date: string) => Math.floor((Date.now() - Date.parse(date)) / (7 * 86400000))

/** One entry per ingredient (Tomate/Tomaten count as one), in its most used spelling, most used first. */
export const knownIngredients = (dishes: Dish[]) => {
  const count = new Map<string, number>()
  for (const i of dishes.flatMap((d) => d.ingredients)) {
    const n = i.name.trim()
    if (n) count.set(n, (count.get(n) ?? 0) + 1)
  }
  const best = new Map<string, { name: string; n: number; total: number }>()
  for (const [name, n] of count) {
    const k = ingredientKey(name)
    const cur = best.get(k)
    if (!cur) best.set(k, { name, n, total: n })
    else best.set(k, { ...(n > cur.n ? { name, n } : cur), total: cur.total + n })
  }
  return [...best.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, locale)).map((b) => b.name)
}

export const knownTags = (dishes: Dish[]) => {
  const count = new Map<string, number>()
  for (const tag of dishes.flatMap((d) => d.tags)) count.set(tag, (count.get(tag) ?? 0) + 1)
  return [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!)
}
