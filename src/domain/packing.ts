import type { Entry } from '../data/schema'
import { endYear } from './entry'

export type PositionedEntry = {
  entry: Entry
  column: number
}

export type LaneLayout = {
  columnCount: number
  positioned: PositionedEntry[]
}

type GroupLayout = {
  key: string
  start: number
  end: number
  width: number
  innerColumns: number[]
  members: Entry[]
}

function packIntervals(intervals: { start: number; end: number }[]): {
  columnCount: number
  columns: number[]
} {
  const ends: number[] = []
  const columns = intervals.map(({ start, end }) => {
    const found = ends.findIndex((e) => e <= start)
    const column = found === -1 ? ends.length : found
    ends[column] = end
    return column
  })
  return { columnCount: Math.max(ends.length, 1), columns }
}

function isRangeFree(columnEnds: number[], base: number, width: number, start: number): boolean {
  for (let i = 0; i < width; i++) {
    const end = columnEnds[base + i]
    if (end !== undefined && end > start) return false
  }
  return true
}

function findSlot(columnEnds: number[], start: number, width: number): number {
  for (let base = 0; base <= columnEnds.length; base++) {
    if (isRangeFree(columnEnds, base, width, start)) return base
  }
  return columnEnds.length
}

function groupByGroupKey(entries: Entry[]): Map<string, Entry[]> {
  const byGroup = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = e.group ?? `solo:${e.id}`
    const members = byGroup.get(key)
    if (members) members.push(e)
    else byGroup.set(key, [e])
  }
  return byGroup
}

function computeGroupLayouts(byGroup: Map<string, Entry[]>): GroupLayout[] {
  return [...byGroup.entries()]
    .map(([key, members]) => {
      const sorted = [...members].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
      const inner = packIntervals(sorted.map((e) => ({ start: e.start, end: endYear(e) })))
      return {
        key,
        start: Math.min(...sorted.map((e) => e.start)),
        end: Math.max(...sorted.map(endYear)),
        width: inner.columnCount,
        innerColumns: inner.columns,
        members: sorted,
      }
    })
    .sort((a, b) => a.start - b.start || a.key.localeCompare(b.key))
}

function placeGroupsInLane(groups: GroupLayout[]): LaneLayout {
  const columnEnds: number[] = []
  const positioned: PositionedEntry[] = []
  for (const group of groups) {
    const base = findSlot(columnEnds, group.start, group.width)
    for (let i = 0; i < group.width; i++) {
      columnEnds[base + i] = Math.max(columnEnds[base + i] ?? Number.NEGATIVE_INFINITY, group.end)
    }
    group.members.forEach((entry, i) => {
      // Why: innerColumns is built 1:1 from the same sorted array as members,
      // so the element at the same index always exists
      const innerColumn = group.innerColumns[i]
      if (innerColumn === undefined) return
      positioned.push({ entry, column: base + innerColumn })
    })
  }
  return { columnCount: Math.max(columnEnds.length, 1), positioned }
}

export function packLane(entries: Entry[]): LaneLayout {
  const byGroup = groupByGroupKey(entries)
  const groups = computeGroupLayouts(byGroup)
  return placeGroupsInLane(groups)
}

function isColumnAvailableForGroupName(
  entry: Entry,
  names: (string | null)[],
  column: number,
): boolean {
  return entry.groupName !== undefined && names[column] === null
}

function isVisibleInYearRange(entry: Entry, topYear: number, bottomYear: number): boolean {
  return entry.start <= bottomYear && endYear(entry) >= topYear
}

export function columnGroupNames(
  layout: LaneLayout,
  topYear: number,
  bottomYear: number,
): (string | null)[] {
  const names: (string | null)[] = new Array(layout.columnCount).fill(null)
  for (const { entry, column } of layout.positioned) {
    if (!isColumnAvailableForGroupName(entry, names, column)) continue
    if (isVisibleInYearRange(entry, topYear, bottomYear)) {
      names[column] = entry.groupName ?? null
    }
  }
  return names
}
