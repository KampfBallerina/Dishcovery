// Lexicalized diminutives that are a different thing than their stem (Brötchen is not Brot).
const KEEP_CHEN = new Set(['brotchen'])

/**
 * Comparison key for ingredient names: Tomate/Tomaten, Äpfel/Apfel, Bockwurst/Bockwürste/Bockwürstchen
 * get the same key. Only for matching, the name shown stays as typed.
 * shortcut: rough German suffix stripping, not a real stemmer; add exceptions to KEEP_CHEN or swap in a stemmer if false matches show up.
 */
export function ingredientKey(name: string): string {
  const s = name.trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  if (s.endsWith('chen') && s.length > 5 && !KEEP_CHEN.has(s)) return s.slice(0, -4)
  // Plural endings; a lone n only after l/r (Zwiebeln, Nudeln) so Champignon and Mohn stay intact,
  // a final s only after a/o/n (Tacos, Champignons) so Reis, Mais and Eis do.
  const m = s.match(/^(.{2,}?)(?:en|er|e|([lr])n|([aon])s)$/)
  return m ? m[1] + (m[2] ?? m[3] ?? '') : s
}

/** Known ingredient names matching what's typed: same ingredient first, then prefix, then anywhere. An exact match means nothing to suggest. */
export function matchIngredients(known: string[], query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase()
  if (!q || known.includes(query.trim())) return []
  const key = ingredientKey(q)
  const rank = (n: string) => (ingredientKey(n) === key ? 0 : n.toLowerCase().startsWith(q) ? 1 : n.toLowerCase().includes(q) ? 2 : 3)
  return known.filter((n) => rank(n) < 3).sort((a, b) => rank(a) - rank(b)).slice(0, limit)
}
