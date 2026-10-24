import type { Dish, ShopItem } from '../db'
import { locale } from '../i18n'

/** Merges ingredients of the planned dishes: same name + unit are summed up. */
export function collect(dishes: Dish[]): ShopItem[] {
  const map = new Map<string, ShopItem>()
  for (const ing of dishes.flatMap((d) => d.ingredients)) {
    const name = ing.name.trim()
    if (!name) continue
    const key = `${name.toLowerCase()}|${ing.unit?.toLowerCase() ?? ''}`
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

export function itemLabel(i: ShopItem) {
  const qty = i.amount != null ? `${fmtAmount(i.amount)}${i.unit ? ' ' + i.unit : ''}` : i.count > 1 ? `${i.count}×` : ''
  return qty ? `${i.name} ${qty}` : i.name
}

/** One line per item, the format Bring! picks up when pasted. */
export const toText = (items: ShopItem[]) => items.filter((i) => i.needed).map(itemLabel).join('\n')
