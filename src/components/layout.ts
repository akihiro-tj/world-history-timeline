import type { LaneLayout } from '../domain/packing'

export const COLUMN_WIDTH = 88
export const COLUMN_GAP = 8
export const LANE_PADDING = 12
export const AXIS_WIDTH = 64
export const HEADER_HEIGHT = 40
export const LABEL_MIN_HEIGHT = 16

export function laneWidth(layout: LaneLayout | undefined): number {
  const columns = Math.max(layout?.columnCount ?? 1, 1)
  return columns * COLUMN_WIDTH + (columns - 1) * COLUMN_GAP + LANE_PADDING * 2
}

export function columnX(laneX: number, column: number): number {
  return laneX + LANE_PADDING + column * (COLUMN_WIDTH + COLUMN_GAP)
}
