import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Dataset } from '../data/schema'
import { columnGroupNames, packLane } from '../domain/packing'
import { createScale } from '../domain/scale'
import { maxVisibleImportance, visibleEntries } from '../domain/visibility'
import { dataYearRange, padYearRange } from '../domain/yearRange'
import { minPxPerYear, wheelZoomFactor, type ZoomState, zoomAt } from '../domain/zoom'
import { DetailPanel } from './DetailPanel'
import { computeEdgeFades, type EdgeFades } from './edgeFades'
import {
  AXIS_WIDTH,
  COLUMN_GAP,
  COLUMN_WIDTH,
  DESKTOP_MEDIA_QUERY,
  FALLBACK_VIEWPORT_WIDTH,
  GROUP_HEADER_HEIGHT,
  HEADER_HEIGHT,
  LANE_PADDING,
  laneWidth,
  PANEL_HEIGHT_RATIO,
  PANEL_WIDTH_PX,
  TOP_BAR_HEIGHT,
} from './layout'
import { hasSeenOnboarding, markOnboardingSeen } from './onboardingStorage'
import { TimelineView } from './TimelineView'
import { TopBar } from './TopBar'
import { WelcomeOverlay } from './WelcomeOverlay'
import { ZoomControls } from './ZoomControls'

const FALLBACK_VIEWPORT_HEIGHT = 800
const BUTTON_ZOOM_FACTOR = 1.4
const REVEAL_MARGIN_PX = 16
const DRAG_THRESHOLD_PX = 5

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { regions, entries } = dataset
  const tickRange = useMemo(() => dataYearRange(entries), [entries])
  const scaleRange = useMemo(() => padYearRange(tickRange), [tickRange])
  const totalYears = scaleRange.maxYear - scaleRange.minYear
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [zoom, setZoom] = useState<ZoomState>({
    pxPerYear: minPxPerYear(totalYears, FALLBACK_VIEWPORT_HEIGHT),
    scrollTop: 0,
  })
  const [edgeFades, setEdgeFades] = useState<EdgeFades>({
    top: false,
    bottom: false,
    left: false,
    right: false,
  })
  const updateEdgeFades = useCallback((container: HTMLDivElement) => {
    setEdgeFades((prev) => {
      const next = computeEdgeFades(container)
      return prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.left === next.left &&
        prev.right === next.right
        ? prev
        : next
    })
  }, [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const hasUserZoomedRef = useRef(false)
  const dragOrigin = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const suppressClickRef = useRef(false)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(() => !hasSeenOnboarding())
  const closeHelp = useCallback(() => {
    markOnboardingSeen()
    setIsHelpOpen(false)
  }, [])

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current
      setViewportHeight(container?.clientHeight || FALLBACK_VIEWPORT_HEIGHT)
      if (container) updateEdgeFades(container)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [updateEdgeFades])

  useEffect(() => {
    const container = containerRef.current
    if (container && container.scrollTop !== zoom.scrollTop) {
      container.scrollTop = zoom.scrollTop
    }
  }, [zoom])

  useEffect(() => {
    if (hasUserZoomedRef.current) return
    setZoom((prev) => {
      const pxPerYear = minPxPerYear(totalYears, viewportHeight)
      if (pxPerYear === prev.pxPerYear) return prev
      return { pxPerYear, scrollTop: (prev.scrollTop / prev.pxPerYear) * pxPerYear }
    })
  }, [viewportHeight, totalYears])

  const applyZoom = useCallback(
    (factor: number, anchorOffset: number) => {
      hasUserZoomedRef.current = true
      setZoom((prev) => zoomAt(prev, factor, anchorOffset, totalYears, viewportHeight))
    },
    [totalYears, viewportHeight],
  )

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  )
  const panelOpen = selectedEntry !== null

  useEffect(() => {
    if (panelOpen) return
    const container = containerRef.current
    if (!container) return
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    if (container.scrollLeft > maxScrollLeft) container.scrollLeft = maxScrollLeft
    if (container.scrollTop > maxScrollTop) {
      container.scrollTop = maxScrollTop
      setZoom((prev) => ({ ...prev, scrollTop: maxScrollTop }))
    }
  }, [panelOpen])

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: zoom / laneWidths / viewportHeight は DOM のスクロール寸法が変わった後に再計測するためのトリガー
  useEffect(() => {
    const container = containerRef.current
    if (container) updateEdgeFades(container)
  }, [zoom, laneWidths, viewportHeight, updateEdgeFades])

  const applyZoomAtContainerOffset = useCallback(
    (factor: number, containerOffset: number) => {
      applyZoom(factor, containerOffset - headerHeightPx)
    },
    [applyZoom, headerHeightPx],
  )

  const [pendingJump, setPendingJump] = useState<{ id: string; mode: 'center' | 'reveal' } | null>(
    null,
  )

  const jumpToEntry = useCallback((id: string) => {
    setSelectedId(id)
    setPendingJump({ id, mode: 'center' })
  }, [])

  const selectEntry = useCallback((id: string) => {
    setSelectedId(id)
    setPendingJump({ id, mode: 'reveal' })
  }, [])

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
    [viewportHeight],
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
    const positioned = laneLayouts
      .get(entry.region)
      ?.positioned.find((p) => p.entry.id === entry.id)

    if (mode === 'center') {
      if (laneIndex >= 0 && positioned) {
        const entryCenterX =
          AXIS_WIDTH +
          laneOffsets[laneIndex] +
          LANE_PADDING +
          positioned.column * (COLUMN_WIDTH + COLUMN_GAP) +
          COLUMN_WIDTH / 2
        container.scrollLeft = Math.max(0, entryCenterX - AXIS_WIDTH - viewport.width / 2)
      }
      setZoom((prev) => ({
        ...prev,
        scrollTop: Math.max(
          0,
          (entry.start - scaleRange.minYear) * prev.pxPerYear - viewport.height / 2,
        ),
      }))
      return
    }

    if (laneIndex >= 0 && positioned) {
      const columnLeftX =
        AXIS_WIDTH +
        laneOffsets[laneIndex] +
        LANE_PADDING +
        positioned.column * (COLUMN_WIDTH + COLUMN_GAP)
      const columnRightX = columnLeftX + COLUMN_WIDTH
      const visibleLeft = container.scrollLeft + AXIS_WIDTH
      const visibleRight = container.scrollLeft + AXIS_WIDTH + viewport.width
      if (columnLeftX < visibleLeft + REVEAL_MARGIN_PX) {
        container.scrollLeft = Math.max(0, columnLeftX - AXIS_WIDTH - REVEAL_MARGIN_PX)
      } else if (columnRightX > visibleRight - REVEAL_MARGIN_PX) {
        container.scrollLeft = Math.max(
          0,
          columnRightX - AXIS_WIDTH - viewport.width + REVEAL_MARGIN_PX,
        )
      }
    }
    setZoom((prev) => {
      const entryTopY = (entry.start - scaleRange.minYear) * prev.pxPerYear
      const visibleTop = prev.scrollTop + REVEAL_MARGIN_PX
      const visibleBottom = prev.scrollTop + viewport.height - REVEAL_MARGIN_PX
      if (entryTopY < visibleTop) {
        return { ...prev, scrollTop: Math.max(0, entryTopY - REVEAL_MARGIN_PX) }
      }
      if (entryTopY > visibleBottom) {
        return { ...prev, scrollTop: Math.max(0, entryTopY - viewport.height + REVEAL_MARGIN_PX) }
      }
      return prev
    })
  }, [pendingJump, entries, regions, laneLayouts, laneOffsets, scaleRange, visibleViewport])

  const jumpToYear = useCallback(
    (year: number) => {
      const viewport = visibleViewport(selectedId !== null)
      setZoom((prev) => ({
        ...prev,
        scrollTop: Math.max(0, (year - scaleRange.minYear) * prev.pxPerYear - viewport.height / 2),
      }))
    },
    [scaleRange.minYear, selectedId, visibleViewport],
  )

  const inView = useMemo(() => {
    const marginYears = viewportHeight / zoom.pxPerYear
    const topYear = scale.yToYear(zoom.scrollTop) - marginYears
    const bottomYear = scale.yToYear(zoom.scrollTop + viewportHeight) + marginYears
    const effectiveMaxImportance = Math.max(maxImportance, selectedEntry?.importance ?? 0)
    return new Set(
      visibleEntries(tierEntries, topYear, bottomYear, effectiveMaxImportance).map((e) => e.id),
    )
  }, [tierEntries, scale, zoom, viewportHeight, maxImportance, selectedEntry])

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (isHelpOpen) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      dragOrigin.current = null
      setIsDragging(false)
      return
    }
    const container = containerRef.current
    if (e.pointerType !== 'mouse' || e.button !== 0 || !container) return
    dragOrigin.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }
  const handlePointerMove = (e: ReactPointerEvent) => {
    if (isHelpOpen) return
    const drag = dragOrigin.current
    if (drag && drag.pointerId === e.pointerId && pointers.current.size < 2) {
      const dx = e.clientX - drag.clientX
      const dy = e.clientY - drag.clientY
      if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) setIsDragging(true)
      if (isDragging || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        const container = containerRef.current
        if (container) {
          container.scrollLeft = drag.scrollLeft - dx
          container.scrollTop = drag.scrollTop - dy
        }
      }
    }
    const prev = pointers.current.get(e.pointerId)
    if (!prev || pointers.current.size !== 2) {
      if (prev) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      return
    }
    const [a, b] = [...pointers.current.values()]
    const distanceBefore = Math.hypot(a.x - b.x, a.y - b.y)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const [a2, b2] = [...pointers.current.values()]
    const distanceAfter = Math.hypot(a2.x - b2.x, a2.y - b2.y)
    if (distanceBefore > 0) {
      const rect = containerRef.current?.getBoundingClientRect()
      const anchorOffset = (a2.y + b2.y) / 2 - (rect?.top ?? 0)
      applyZoomAtContainerOffset(distanceAfter / distanceBefore, anchorOffset)
    }
  }

  useEffect(() => {
    const removePointer = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (dragOrigin.current?.pointerId === e.pointerId) {
        dragOrigin.current = null
        setIsDragging(false)
        if (isDraggingRef.current) suppressClickRef.current = true
      }
    }
    window.addEventListener('pointerup', removePointer)
    window.addEventListener('pointercancel', removePointer)
    return () => {
      window.removeEventListener('pointerup', removePointer)
      window.removeEventListener('pointercancel', removePointer)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      applyZoomAtContainerOffset(wheelZoomFactor(e.deltaY), e.clientY - rect.top)
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [applyZoomAtContainerOffset])

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <TopBar
        entries={entries}
        onJumpToYear={jumpToYear}
        onSelectEntry={jumpToEntry}
        onOpenHelp={() => setIsHelpOpen(true)}
      />
      <TimelineView
        containerRef={containerRef}
        dataset={dataset}
        scale={scale}
        yearRange={tickRange}
        laneLayouts={laneLayouts}
        laneWidths={laneWidths}
        laneOffsets={laneOffsets}
        groupLabels={groupLabels}
        showGroupRow={showGroupRow}
        panelOpen={panelOpen}
        dragging={isDragging}
        inView={inView}
        selectedId={selectedId}
        onSelect={selectEntry}
        onScroll={(e) => {
          const el = e.currentTarget
          setZoom((prev) =>
            prev.scrollTop === el.scrollTop ? prev : { ...prev, scrollTop: el.scrollTop },
          )
          updateEdgeFades(el)
        }}
        viewportTopY={zoom.scrollTop}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20"
        style={{ top: TOP_BAR_HEIGHT + headerHeightPx }}
      >
        {edgeFades.top && (
          <div
            data-testid="fade-top"
            className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface to-transparent"
          />
        )}
        {edgeFades.bottom && (
          <div
            data-testid="fade-bottom"
            className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent"
          />
        )}
        {edgeFades.left && (
          <div
            data-testid="fade-left"
            className="absolute inset-y-0 w-6 bg-gradient-to-r from-surface to-transparent"
            style={{ left: AXIS_WIDTH }}
          />
        )}
        {edgeFades.right && (
          <div
            data-testid="fade-right"
            className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface to-transparent"
          />
        )}
      </div>
      <ZoomControls
        onZoomIn={() => applyZoomAtContainerOffset(BUTTON_ZOOM_FACTOR, viewportHeight / 2)}
        onZoomOut={() => applyZoomAtContainerOffset(1 / BUTTON_ZOOM_FACTOR, viewportHeight / 2)}
        onFitAll={() => {
          hasUserZoomedRef.current = true
          setZoom({ pxPerYear: minPxPerYear(totalYears, viewportHeight), scrollTop: 0 })
        }}
        panelOpen={panelOpen}
      />
      {selectedEntry && (
        <DetailPanel
          entry={selectedEntry}
          dataset={dataset}
          onSelect={jumpToEntry}
          onClose={() => setSelectedId(null)}
        />
      )}
      {isHelpOpen && <WelcomeOverlay onClose={closeHelp} />}
    </div>
  )
}
