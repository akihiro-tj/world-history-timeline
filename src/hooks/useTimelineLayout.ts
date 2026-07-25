import { useMemo } from 'react'
import { GROUP_HEADER_HEIGHT, HEADER_HEIGHT, laneWidth } from '../components/layout'
import type { Entry, Region } from '../data/schema'
import { columnGroupNames, packLane } from '../domain/packing'
import { createScale } from '../domain/scale'
import { maxVisibleImportance, visibleEntries } from '../domain/visibility'
import type { YearRange } from '../domain/yearRange'
import type { ZoomState } from '../domain/zoom'

export function useTimelineLayout({
  regions,
  entries,
  scaleRange,
  zoom,
  viewportHeight,
  selectedId,
  selectedEntry,
}: {
  regions: Region[]
  entries: Entry[]
  scaleRange: YearRange
  zoom: ZoomState
  viewportHeight: number
  selectedId: string | null
  selectedEntry: Entry | null
}) {
  const scale = useMemo(
    () => createScale(scaleRange.minYear, scaleRange.maxYear, zoom.pxPerYear),
    [scaleRange, zoom.pxPerYear],
  )
  const maxImportance = maxVisibleImportance(zoom.pxPerYear)
  const tierEntries = useMemo(() => {
    const visible = entries.filter((e) => e.importance <= maxImportance)
    if (selectedId && !visible.some((e) => e.id === selectedId)) {
      const selected = entries.find((e) => e.id === selectedId)
      if (selected) visible.push(selected)
    }
    return visible
  }, [entries, maxImportance, selectedId])
  const laneLayouts = useMemo(
    () =>
      new Map(regions.map((r) => [r.id, packLane(tierEntries.filter((e) => e.region === r.id))])),
    [regions, tierEntries],
  )
  const laneWidths = useMemo(
    () => regions.map((r) => laneWidth(laneLayouts.get(r.id))),
    [regions, laneLayouts],
  )
  const laneOffsets = useMemo(() => {
    const offsets: number[] = []
    let acc = 0
    for (const width of laneWidths) {
      offsets.push(acc)
      acc += width
    }
    return offsets
  }, [laneWidths])
  const groupLabels = useMemo(() => {
    const topYear = scale.yToYear(zoom.scrollTop)
    const bottomYear = scale.yToYear(zoom.scrollTop + viewportHeight)
    return regions.map((r) =>
      columnGroupNames(
        laneLayouts.get(r.id) ?? { columnCount: 1, positioned: [] },
        topYear,
        bottomYear,
      ),
    )
  }, [regions, laneLayouts, scale, zoom.scrollTop, viewportHeight])
  const showGroupRow = maxImportance >= 2 && groupLabels.some((lane) => lane.some(Boolean))
  const headerHeightPx = HEADER_HEIGHT + (showGroupRow ? GROUP_HEADER_HEIGHT : 0)

  const inView = useMemo(() => {
    const marginYears = viewportHeight / zoom.pxPerYear
    const topYear = scale.yToYear(zoom.scrollTop) - marginYears
    const bottomYear = scale.yToYear(zoom.scrollTop + viewportHeight) + marginYears
    const effectiveMaxImportance = Math.max(maxImportance, selectedEntry?.importance ?? 0)
    return new Set(
      visibleEntries(tierEntries, topYear, bottomYear, effectiveMaxImportance).map((e) => e.id),
    )
  }, [tierEntries, scale, zoom, viewportHeight, maxImportance, selectedEntry])

  return {
    scale,
    maxImportance,
    tierEntries,
    laneLayouts,
    laneWidths,
    laneOffsets,
    groupLabels,
    showGroupRow,
    headerHeightPx,
    inView,
  }
}
