import type { Synced } from '../db'

/** Field-level last-write-wins. Ties keep `local`. Returns the merged data without _dirty/_rev. */
// shortcut: trusts device clocks, a badly skewed clock wins too often; switch to hybrid logical clocks if that shows up.
export function merge<T extends Synced>(local: T, remote: T): T {
  const out: Record<string, unknown> = { id: local.id }
  const ts: Record<string, number> = {}
  for (const k of new Set([...Object.keys(local._ts), ...Object.keys(remote._ts)])) {
    const tl = local._ts[k] ?? 0
    const tr = remote._ts[k] ?? 0
    out[k] = (tr > tl ? remote : local)[k as keyof T]
    ts[k] = Math.max(tl, tr)
  }
  return { ...out, _ts: ts } as T
}

/** True when `merged` holds anything newer than `remote`, i.e. it must be uploaded. */
export const isAhead = (merged: Synced, remote: Synced) =>
  Object.keys(merged._ts).some((k) => merged._ts[k] > (remote._ts[k] ?? 0))

export function strip<T extends Synced>({ _dirty, _rev, ...rest }: T) {
  return rest
}
