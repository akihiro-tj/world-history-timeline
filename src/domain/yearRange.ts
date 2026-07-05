import type { Entry } from '../data/schema'

const ROUNDING_YEARS = 100
const AXIS_MARGIN_YEARS = 100

export type YearRange = {
  minYear: number
  maxYear: number
}

export function dataYearRange(entries: Entry[]): YearRange {
  if (entries.length === 0) return { minYear: 0, maxYear: ROUNDING_YEARS }
  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  for (const entry of entries) {
    earliest = Math.min(earliest, entry.start)
    latest = Math.max(latest, entry.end ?? entry.start)
  }
  const minYear = Math.floor(earliest / ROUNDING_YEARS) * ROUNDING_YEARS
  const maxYear = Math.ceil(latest / ROUNDING_YEARS) * ROUNDING_YEARS
  return { minYear, maxYear: maxYear > minYear ? maxYear : minYear + ROUNDING_YEARS }
}

export function padYearRange(range: YearRange): YearRange {
  return {
    minYear: range.minYear - AXIS_MARGIN_YEARS,
    maxYear: range.maxYear + AXIS_MARGIN_YEARS,
  }
}
