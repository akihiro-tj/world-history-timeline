import type { LaneLayout } from '../domain/packing'

export const COLUMN_WIDTH = 88
export const COLUMN_GAP = 8
export const LANE_PADDING = 12
export const AXIS_WIDTH = 64
export const TOP_BAR_HEIGHT = 48
export const HEADER_HEIGHT = 40
export const GROUP_HEADER_HEIGHT = 20
export const LABEL_MIN_HEIGHT = 16
// DetailPanel の md:w-80 / max-h-[50dvh] と連動。変えるときは両方変える
export const PANEL_WIDTH_PX = 320
export const PANEL_HEIGHT_RATIO = 0.5
export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'
export const FALLBACK_VIEWPORT_WIDTH = 1200

export function laneWidth(layout: LaneLayout | undefined): number {
  const columns = Math.max(layout?.columnCount ?? 1, 1)
  return columns * COLUMN_WIDTH + (columns - 1) * COLUMN_GAP + LANE_PADDING * 2
}

export function columnX(laneX: number, column: number): number {
  return laneX + LANE_PADDING + column * (COLUMN_WIDTH + COLUMN_GAP)
}
