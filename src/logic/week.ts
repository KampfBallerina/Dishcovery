import type { Meal, SlotKey, Week } from '../db'

/** ISO-8601 week id, e.g. "2026-w43". Zero-padded so ids sort chronologically as strings. */
export function weekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day) // Thursday decides the year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-w${String(week).padStart(2, '0')}`
}

/** Local-time Monday of the given week id. */
export function mondayOf(id: string): Date {
  const [y, w] = id.split('-w').map(Number)
  const jan4 = new Date(y, 0, 4)
  const monday = new Date(y, 0, 4 - ((jan4.getDay() || 7) - 1) + (w - 1) * 7)
  return monday
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const shiftWeek = (id: string, n: number) => weekId(addDays(mondayOf(id), n * 7))
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const slotKey = (day: number, meal: Meal): SlotKey => `${day}-${meal}`

/** Dinner always, lunch only when switched on for that day. */
export function visibleSlots(week: Week | undefined, days = [0, 1, 2, 3, 4, 5, 6]): SlotKey[] {
  return days.flatMap((d) => {
    const lunch = slotKey(d, 'mittag')
    return week?.[lunch] ? [lunch, slotKey(d, 'abend')] : [slotKey(d, 'abend')]
  })
}

export const dishIdsOf = (week: Week | undefined) =>
  visibleSlots(week).flatMap((k) => (week?.[k]?.dishId ? [week[k]!.dishId!] : []))
