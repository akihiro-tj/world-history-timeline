export type ZoomState = {
  pxPerYear: number
  scrollTop: number
}

const WHEEL_ZOOM_SENSITIVITY = 0.008
const WHEEL_FACTOR_MIN = 0.8
const WHEEL_FACTOR_MAX = 1.25

const FIT_ALL_SCREENS = 2.5
const CENTURY_YEARS = 100
const TIER3_GUARANTEE_PX_PER_YEAR = 5

export const INITIAL_FOCUS_YEAR = 1500
const INITIAL_VIEW_YEARS = 500

export function wheelZoomFactor(deltaY: number): number {
  const factor = Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY)
  return Math.min(Math.max(factor, WHEEL_FACTOR_MIN), WHEEL_FACTOR_MAX)
}

export function minPxPerYear(totalYears: number, viewportHeight: number): number {
  return (viewportHeight * FIT_ALL_SCREENS) / totalYears
}

export function initialPxPerYear(viewportHeight: number): number {
  return viewportHeight / INITIAL_VIEW_YEARS
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
