import type { Entry } from '../data/schema'

export const TIER2_MIN_PX_PER_YEAR = 1
export const TIER3_MIN_PX_PER_YEAR = 4

export function maxVisibleImportance(pxPerYear: number): 1 | 2 | 3 {
  if (pxPerYear >= TIER3_MIN_PX_PER_YEAR) return 3
  if (pxPerYear >= TIER2_MIN_PX_PER_YEAR) return 2
  return 1
}

export function visibleEntries(
  entries: Entry[],
  topYear: number,
  bottomYear: number,
  maxImportance: number,
): Entry[] {
  return entries.filter(
    (e) => e.importance <= maxImportance && e.start <= bottomYear && (e.end ?? e.start) >= topYear,
  )
}
