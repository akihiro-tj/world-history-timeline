export type ZoomState = {
  pxPerYear: number
  scrollTop: number
}

const FIT_ALL_SCREENS = 2.5
const CENTURY_YEARS = 100

export function minPxPerYear(totalYears: number, viewportHeight: number): number {
  return (viewportHeight * FIT_ALL_SCREENS) / totalYears
}

export function maxPxPerYear(viewportHeight: number): number {
  return viewportHeight / CENTURY_YEARS
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
