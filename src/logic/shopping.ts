import type { Dish, ShoppingDraft, ShopItem } from '../db'
import { locale } from '../i18n'
import { ingredientKey } from './ingredients'

/** Merges ingredients of the planned dishes: same ingredient (see ingredientKey) + unit are summed up, the first spelling is shown. */
export function collect(dishes: Dish[]): ShopItem[] {
  const map = new Map<string, ShopItem>()
  for (const ing of dishes.flatMap((d) => d.ingredients)) {
    const name = ing.name.trim()
    if (!name) continue
    const key = `${ingredientKey(name)}|${ing.unit?.toLowerCase() ?? ''}`
    const cur = map.get(key)
    if (!cur) map.set(key, { key, name, amount: ing.amount, unit: ing.unit, count: 1, needed: true })
    else {
      cur.count++
      // An amount-less mention keeps the sum but is shown via count.
      if (ing.amount != null) cur.amount = (cur.amount ?? 0) + ing.amount
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, locale))
}

export const fmtAmount = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 })

/** Quantity part ("spec" in Bring!), only with a unit: "1 Becher" Schmand yes, "1" Apfel just "Apfel". */
export const itemSpec = (i: ShopItem) => (i.amount != null && i.unit ? `${fmtAmount(i.amount)} ${i.unit}` : '')

export function itemLabel(i: ShopItem) {
  const qty = itemSpec(i)
  return qty ? `${i.name} ${qty}` : i.name
}

/** One line per item, the format Bring! picks up when pasted. */
export const toText = (items: ShopItem[]) => items.filter((i) => i.needed).map(itemLabel).join('\n')

/** The list follows the week plan live; the draft only stores what people changed: unchecked and own items. */
export function shoppingList(planned: Dish[], draft: Pick<ShoppingDraft, 'excluded' | 'extra'> = {}) {
  const excluded = new Set(draft.excluded)
  return [...collect(planned), ...(draft.extra ?? [])].map((i) => ({ ...i, needed: !excluded.has(i.key) }))
}