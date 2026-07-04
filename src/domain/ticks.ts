const INTERVALS = [10, 50, 100, 500]
const MIN_TICK_SPACING_PX = 48

export function tickInterval(pxPerYear: number): number {
  return INTERVALS.find((interval) => interval * pxPerYear >= MIN_TICK_SPACING_PX) ?? 500
}

export function generateTicks(minYear: number, maxYear: number, interval: number): number[] {
  const ticks: number[] = []
  for (let year = Math.ceil(minYear / interval) * interval; year <= maxYear; year += interval) {
    ticks.push(year)
  }
  return ticks
}
