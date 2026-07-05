export type ZoomState = {
  pxPerYear: number
  scrollTop: number
}

const FIT_ALL_SCREENS = 2.5
const CENTURY_YEARS = 100
const TIER3_GUARANTEE_PX_PER_YEAR = 5

export function minPxPerYear(totalYears: number, viewportHeight: number): number {
  return (viewportHeight * FIT_ALL_SCREENS) / totalYears
}

export function maxPxPerYear(viewportHeight: number): number {
  // 5 = visibility.ts の TIER3_MIN_PX_PER_YEAR(4) を確実に超える下限
  return Math.max(viewportHeight / CENTURY_YEARS, TIER3_GUARANTEE_PX_PER_YEAR)
}

export function clampPxPerYear(
  pxPerYear: number,
  totalYears: number,
  viewportHeight: number,
): number {
  return Math.min(
    Math.max(pxPerYear, minPxPerYear(totalYears, viewportHeight)),
    maxPxPerYear(viewportHeight),
  )
}

export function zoomAt(
  state: ZoomState,
  factor: number,
  anchorOffset: number,
  totalYears: number,
  viewportHeight: number,
): ZoomState {
  const pxPerYear = clampPxPerYear(state.pxPerYear * factor, totalYears, viewportHeight)
  const anchorYears = (state.scrollTop + anchorOffset) / state.pxPerYear
  return {
    pxPerYear,
    scrollTop: Math.max(0, anchorYears * pxPerYear - anchorOffset),
  }
}
