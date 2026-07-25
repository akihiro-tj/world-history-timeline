import type { Entry } from '../data/schema'

export function endYear(entry: Entry): number {
  return entry.end ?? entry.start
}
