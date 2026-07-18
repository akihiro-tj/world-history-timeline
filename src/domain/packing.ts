import type { Entry } from '../data/schema'

export type PositionedEntry = {
  entry: Entry
  column: number
}

export type LaneLayout = {
  columnCount: number
  positioned: PositionedEntry[]
}

const endOf = (e: Entry) => e.end ?? e.start

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

function findSlot(columnEnds: number[], start: number, width: number): number {
  for (let base = 0; base <= columnEnds.length; base++) {
    let free = true
    for (let i = 0; i < width; i++) {
      const end = columnEnds[base + i]
      if (end !== undefined && end > start) {
        free = false
        break
      }
    }
    if (free) return base
  }
  return columnEnds.length
}

export function packLane(entries: Entry[]): LaneLayout {
  const byGroup = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = e.group ?? `solo:${e.id}`
    const members = byGroup.get(key)
    if (members) members.push(e)
    else byGroup.set(key, [e])
  }

  const groups = [...byGroup.entries()]
    .map(([key, members]) => {
      const sorted = [...members].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
      const inner = packIntervals(sorted.map((e) => ({ start: e.start, end: endOf(e) })))
      return {
        key,
        start: Math.min(...sorted.map((e) => e.start)),
        end: Math.max(...sorted.map(endOf)),
        width: inner.columnCount,
        innerColumns: inner.columns,
        members: sorted,
      }
    })
    .sort((a, b) => a.start - b.start || a.key.localeCompare(b.key))

  const columnEnds: number[] = []
  const positioned: PositionedEntry[] = []
  for (const group of groups) {
    const base = findSlot(columnEnds, group.start, group.width)
    for (let i = 0; i < group.width; i++) {
      columnEnds[base + i] = Math.max(columnEnds[base + i] ?? Number.NEGATIVE_INFINITY, group.end)
    }
    group.members.forEach((entry, i) => {
      // Why: innerColumns は members と同じ sorted 配列から1:1で作られるため、
      // 同じ添字に対応する要素が必ず存在する
      const innerColumn = group.innerColumns[i]
      if (innerColumn === undefined) return
      positioned.push({ entry, column: base + innerColumn })
    })
  }
  return { columnCount: Math.max(columnEnds.length, 1), positioned }
}

export function columnGroupNames(
  layout: LaneLayout,
  topYear: number,
  bottomYear: number,
): (string | null)[] {
  const names: (string | null)[] = new Array(layout.columnCount).fill(null)
  for (const { entry, column } of layout.positioned) {
    if (entry.groupName === undefined || names[column] !== null) continue
    if (entry.start <= bottomYear && (entry.end ?? entry.start) >= topYear) {
      names[column] = entry.groupName
    }
  }
  return names
}
