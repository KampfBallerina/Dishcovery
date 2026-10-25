import type { Dish, Slot, SlotKey, Week } from '../db'
import { ingredientKey } from './ingredients'

const weight = (d: Dish) => (d.favorite ? 2 : 1)

/** Weighted random pick. Relaxes the rules step by step when too few dishes are left. */
export function pick(dishes: Dish[], avoid: Set<string>, recent: Set<string>, rnd = Math.random): Dish | undefined {
  const live = dishes.filter((d) => !d.deleted)
  const pools = [
    live.filter((d) => !avoid.has(d.id) && !recent.has(d.id)),
    live.filter((d) => !avoid.has(d.id)),
    live,
  ]
  const pool = pools.find((p) => p.length)
  if (!pool) return undefined
  let r = rnd() * pool.reduce((s, d) => s + weight(d), 0)
  return pool.find((d) => (r -= weight(d)) < 0) ?? pool[pool.length - 1]
}

/** Rolls new dishes for the given slots, skipping locked ones. `recent` = dishes of last week. */
export function reroll(week: Week | undefined, keys: SlotKey[], all: SlotKey[], dishes: Dish[], recent: Set<string>, rnd = Math.random) {
  // Everything currently in the week is avoided, so a rerolled slot also gets a different dish.
  const avoid = new Set(all.flatMap((k) => (week?.[k]?.dishId ? [week[k]!.dishId!] : [])))
  const patch: Partial<Record<SlotKey, Slot>> = {}
  for (const k of keys) {
    if (week?.[k]?.locked) continue
    const d = pick(dishes, avoid, recent, rnd)
    if (!d) break
    avoid.add(d.id)
    patch[k] = { dishId: d.id, locked: false }
  }
  return patch
}

export interface Answers {
  have: string[]
  maxMinutes?: number
  mood?: 'leicht' | 'deftig'
  diet?: 'vegetarisch' | 'fleisch'
  novelty?: 'neu' | 'klassiker'
}

const VEGGIE = ['vegetarisch', 'vegan']
const FOUR_WEEKS = 28 * 86400000

/** Assistant: hard filters for time and diet, scores for the rest. Best first. */
export function suggest(dishes: Dish[], a: Answers, lastEaten: (d: Dish) => string | undefined, now = Date.now()): Dish[] {
  const have = new Set(a.have.map(ingredientKey))
  return dishes
    .filter((d) => !d.deleted)
    .filter((d) => !a.maxMinutes || !d.minutes || d.minutes <= a.maxMinutes)
    .filter((d) => {
      const veggie = d.tags.some((t) => VEGGIE.includes(t.toLowerCase()))
      return a.diet === 'vegetarisch' ? veggie : a.diet === 'fleisch' ? !veggie : true
    })
    .map((d) => {
      const tags = d.tags.map((t) => t.toLowerCase())
      let score = 0
      if (have.size && d.ingredients.length)
        score += (3 * d.ingredients.filter((i) => have.has(ingredientKey(i.name))).length) / d.ingredients.length
      if (a.mood && tags.includes(a.mood)) score += 1
      const last = lastEaten(d)
      if (a.novelty === 'neu' && (!last || now - Date.parse(last) > FOUR_WEEKS)) score += 1
      if (a.novelty === 'klassiker' && d.favorite) score += 1
      return { d, score }
    })
    .sort((x, y) => y.score - x.score || x.d.name.localeCompare(y.d.name))
    .map((x) => x.d)
}
