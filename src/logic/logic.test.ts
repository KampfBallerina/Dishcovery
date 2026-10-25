import { describe, expect, it } from 'vitest'
import type { Dish, Week } from '../db'
import { merge, isAhead } from '../sync/merge'
import { pick, reroll, suggest } from './planner'
import { ingredientKey, matchIngredients } from './ingredients'
import { collect, itemSpec, shoppingList, toText } from './shopping'
import { isOff, mondayOf, openDays, shiftWeek, visibleSlots, weekId } from './week'

const dish = (id: string, extra: Partial<Dish> = {}): Dish => ({
  id, _ts: {}, name: id, ingredients: [], steps: [], servings: 2, tags: [], favorite: false, ...extra,
})

describe('merge', () => {
  it('takes the newer value per field', () => {
    const local = dish('a', { name: 'lokal', notes: 'alt', _ts: { name: 5, notes: 1 } })
    const remote = dish('a', { name: 'remote', notes: 'neu', _ts: { name: 3, notes: 9 } })
    const m = merge(local, remote)
    expect([m.name, m.notes]).toEqual(['lokal', 'neu'])
    expect(isAhead(m, remote)).toBe(true)
    expect(isAhead(merge(remote, remote), remote)).toBe(false)
  })
})

describe('week', () => {
  it('computes ISO weeks across year boundaries', () => {
    expect(weekId(new Date(2026, 9, 24))).toBe('2026-w43')
    expect(weekId(new Date(2027, 0, 1))).toBe('2026-w53')
    expect(mondayOf('2026-w43').getDate()).toBe(19)
    expect(shiftWeek('2026-w53', 1)).toBe('2027-w01')
  })
  it('only keeps today and later open for planning', () => {
    expect(openDays('2026-w43', '2026-10-24')).toEqual([5, 6])
    expect(openDays('2026-w42', '2026-10-24')).toEqual([])
    expect(openDays('2026-w44', '2026-10-24')).toHaveLength(7)
  })
  it('shows lunch only when switched on', () => {
    const w = { id: 'x', _ts: {}, '2-mittag': { dishId: null, locked: false } } as Week
    expect(visibleSlots(w, [1, 2])).toEqual(['1-abend', '2-mittag', '2-abend'])
  })
})

describe('planner', () => {
  const dishes = ['a', 'b', 'c', 'd'].map((id) => dish(id))
  it('avoids recent dishes and falls back when nothing is left', () => {
    expect(pick(dishes, new Set(['a']), new Set(['b', 'c']), () => 0)?.id).toBe('d')
    expect(pick(dishes, new Set(['a', 'b', 'c', 'd']), new Set(), () => 0)?.id).toBe('a')
    expect(pick([], new Set(), new Set())).toBeUndefined()
  })
  it('keeps locked slots and never repeats within the week', () => {
    const w = { id: 'x', _ts: {}, '0-abend': { dishId: 'a', locked: true } } as Week
    const keys = visibleSlots(w, [0, 1, 2, 3])
    const patch = reroll(w, keys, keys, dishes, new Set())
    expect(patch['0-abend']).toBeUndefined()
    const ids = Object.values(patch).map((s) => s!.dishId)
    expect(new Set(ids).size).toBe(3)
    expect(ids).not.toContain('a')
  })
  it('leaves "Kochfrei" slots empty when rolling', () => {
    const w = { id: 'x', _ts: {}, '0-abend': { dishId: null, locked: true }, '1-abend': { dishId: 'gone', locked: true } } as Week
    expect([isOff(w['0-abend']), isOff(w['1-abend']), isOff(undefined), isOff({ dishId: null, locked: false })]).toEqual([true, false, false, false])
    const keys = visibleSlots(w, [0, 1])
    expect(reroll(w, keys, keys, dishes, new Set())).toEqual({})
  })
  it('suggests by ingredients and filters diet', () => {
    const list = [
      dish('nudeln', { ingredients: [{ name: 'Nudeln' }, { name: 'Tomate' }], tags: ['vegetarisch'] }),
      dish('steak', { ingredients: [{ name: 'Rind' }] }),
    ]
    expect(suggest(list, { have: ['nudeln'] }, () => undefined)[0].id).toBe('nudeln')
    expect(suggest(list, { have: [], diet: 'vegetarisch' }, () => undefined).map((d) => d.id)).toEqual(['nudeln'])
  })
})

describe('shopping', () => {
  it('sums same name and unit', () => {
    const items = collect([
      dish('a', { ingredients: [{ name: 'Hack', amount: 200, unit: 'g' }, { name: 'Zwiebel' }] }),
      dish('b', { ingredients: [{ name: 'hack', amount: 200, unit: 'g' }, { name: 'Zwiebel' }] }),
    ])
    expect(toText(items)).toBe('Hack 400 g\nZwiebel')
  })
  it('passes a quantity only with a unit', () => {
    const [apfel, schmand] = collect([dish('a', { ingredients: [{ name: 'Apfel', amount: 1 }, { name: 'Schmand', amount: 1, unit: 'Becher' }] })])
    expect([itemSpec(apfel), itemSpec(schmand)]).toEqual(['', '1 Becher'])
  })
  it('follows the plan and keeps own changes', () => {
    const planned = [dish('a', { ingredients: [{ name: 'Apfel' }, { name: 'Mehl' }] })]
    const extra = [{ key: 'm1', name: 'Kaffee', count: 1, needed: true, manual: true }]
    const list = shoppingList(planned, { excluded: ['mehl|'], extra })
    expect(list.map((i) => [i.name, i.needed])).toEqual([['Apfel', true], ['Mehl', false], ['Kaffee', true]])
  })
})

describe('matchIngredients', () => {
  const known = ['Zwiebel', 'Tomate', 'Frühlingszwiebel', 'Tomatenmark']
  it('puts prefix matches first and ignores case', () => {
    expect(matchIngredients(known, 'zwi')).toEqual(['Zwiebel', 'Frühlingszwiebel'])
  })
  it('suggests the known spelling for a different case, nothing for an exact match or empty input', () => {
    expect(matchIngredients(known, 'tomate')).toEqual(['Tomate', 'Tomatenmark'])
    expect(matchIngredients(known, 'Tomate ')).toEqual([])
    expect(matchIngredients(known, '  ')).toEqual([])
  })
})

describe('ingredientKey', () => {
  const same = (...names: string[]) => expect(new Set(names.map(ingredientKey)).size).toBe(1)
  it('treats plural and diminutive forms as one ingredient', () => {
    same('Tomate', 'Tomaten', ' tomaten ')
    same('Bockwurst', 'Bockwürste', 'Bockwürstchen')
    same('Apfel', 'Äpfel')
    same('Zwiebel', 'Zwiebeln')
    same('Ei', 'Eier')
    same('Champignon', 'Champignons')
  })
  it('keeps different things apart', () => {
    for (const [a, b] of [['Reis', 'Rei'], ['Eis', 'Ei'], ['Brötchen', 'Brot'], ['Tomate', 'Tomatenmark']])
      expect(ingredientKey(a)).not.toBe(ingredientKey(b))
  })
  it('merges spellings on the shopping list and matches them in suggestions', () => {
    const items = collect([dish('a', { ingredients: [{ name: 'Tomaten', amount: 2 }] }), dish('b', { ingredients: [{ name: 'Tomate', amount: 1 }] })])
    expect(items.map((i) => [i.name, i.amount])).toEqual([['Tomaten', 3]])
    expect(matchIngredients(['Tomate'], 'Tomaten')).toEqual(['Tomate'])
  })
})
