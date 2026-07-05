import type { Entry, Region } from '../data/schema'

export function findContemporaries(
  selected: Entry,
  entries: Entry[],
  regions: Region[],
  limit = 10,
): Entry[] {
  const regionOrder = new Map(regions.map((r) => [r.id, r.order]))
  const start = selected.start
  const end = selected.end ?? selected.start
  return entries
    .filter(
      (e) =>
        e.id !== selected.id &&
        e.region !== selected.region &&
        e.importance <= 2 &&
        e.start <= end &&
        (e.end ?? e.start) >= start,
    )
    .sort(
      (a, b) =>
        (regionOrder.get(a.region) ?? 0) - (regionOrder.get(b.region) ?? 0) || a.start - b.start,
    )
    .slice(0, limit)
}
