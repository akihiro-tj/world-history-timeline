import { type RefObject, useCallback, useEffect, useState } from 'react'
import {
  AXIS_WIDTH,
  COLUMN_WIDTH,
  columnX,
  DESKTOP_MEDIA_QUERY,
  FALLBACK_VIEWPORT_WIDTH,
  PANEL_HEIGHT_RATIO,
  PANEL_WIDTH_PX,
} from '../components/layout'
import type { Entry, Region } from '../data/schema'
import {
  centerHorizontalScroll,
  centerVerticalScroll,
  type JumpColumn,
  revealHorizontalScroll,
  revealVerticalScroll,
} from '../domain/jump'
import type { LaneLayout } from '../domain/packing'
import type { ZoomState } from '../domain/zoom'

const REVEAL_MARGIN_PX = 16

type PendingJump = { id: string; mode: 'center' | 'reveal' }

export function useEntryJump({
  containerRef,
  entries,
  regions,
  laneLayouts,
  laneOffsets,
  minYear,
  viewportHeight,
  selectedId,
  setSelectedId,
  updateScrollTop,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  entries: Entry[]
  regions: Region[]
  laneLayouts: Map<string, LaneLayout>
  laneOffsets: number[]
  minYear: number
  viewportHeight: number
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  updateScrollTop: (compute: (prev: ZoomState) => number | null) => void
}) {
  const [pendingJump, setPendingJump] = useState<PendingJump | null>(null)

  const jumpToEntry = useCallback(
    (id: string) => {
      setSelectedId(id)
      setPendingJump({ id, mode: 'center' })
    },
    [setSelectedId],
  )

  const selectEntry = useCallback(
    (id: string) => {
      setSelectedId(id)
      setPendingJump({ id, mode: 'reveal' })
    },
    [setSelectedId],
  )

  const visibleViewport = useCallback(
    (panelOpen: boolean) => {
      const isDesktop = window.matchMedia(DESKTOP_MEDIA_QUERY).matches
      const container = containerRef.current
      const width = container?.clientWidth || FALLBACK_VIEWPORT_WIDTH
      return {
        height:
          panelOpen && !isDesktop ? viewportHeight * (1 - PANEL_HEIGHT_RATIO) : viewportHeight,
        width: Math.max(0, width - AXIS_WIDTH - (panelOpen && isDesktop ? PANEL_WIDTH_PX : 0)),
      }
    },
    [containerRef, viewportHeight],
  )

  useEffect(() => {
    if (!pendingJump) return
    const entry = entries.find((e) => e.id === pendingJump.id)
    const container = containerRef.current
    const { mode } = pendingJump
    setPendingJump(null)
    if (!entry || !container) return
    const viewport = visibleViewport(true)
    const laneIndex = regions.findIndex((r) => r.id === entry.region)
    // Why: laneOffsets is built with the same order and length as regions,
    // so once laneIndex is found, the corresponding element always exists
    const laneOffset = laneIndex >= 0 ? laneOffsets[laneIndex] : undefined
    const positioned = laneLayouts
      .get(entry.region)
      ?.positioned.find((p) => p.entry.id === entry.id)
    const column: JumpColumn | undefined =
      laneOffset !== undefined && positioned
        ? { left: columnX(AXIS_WIDTH + laneOffset, positioned.column), width: COLUMN_WIDTH }
        : undefined

    if (mode === 'center') {
      const scrollLeft = centerHorizontalScroll(column, AXIS_WIDTH, viewport.width)
      if (scrollLeft !== null) container.scrollLeft = scrollLeft
      updateScrollTop((prev) =>
        centerVerticalScroll(entry.start, minYear, prev.pxPerYear, viewport.height),
      )
      return
    }

    const scrollLeft = revealHorizontalScroll(
      column,
      AXIS_WIDTH,
      viewport.width,
      container.scrollLeft,
      REVEAL_MARGIN_PX,
    )
    if (scrollLeft !== null) container.scrollLeft = scrollLeft
    updateScrollTop((prev) =>
      revealVerticalScroll(
        entry.start,
        minYear,
        prev.pxPerYear,
        prev.scrollTop,
        viewport.height,
        REVEAL_MARGIN_PX,
      ),
    )
  }, [
    pendingJump,
    entries,
    regions,
    laneLayouts,
    laneOffsets,
    minYear,
    visibleViewport,
    updateScrollTop,
    containerRef,
  ])

  const jumpToYear = useCallback(
    (year: number) => {
      const viewport = visibleViewport(selectedId !== null)
      updateScrollTop((prev) =>
        centerVerticalScroll(year, minYear, prev.pxPerYear, viewport.height),
      )
    },
    [minYear, selectedId, visibleViewport, updateScrollTop],
  )

  return { jumpToEntry, selectEntry, jumpToYear }
}
