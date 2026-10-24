import de from './de.json'

// New language: add xx.json with the same keys and switch here.
const strings: Record<string, unknown> = de
export const locale = 'de-DE'

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], strings)
  if (typeof value !== 'string') return key
  return value.replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? ''))
}
