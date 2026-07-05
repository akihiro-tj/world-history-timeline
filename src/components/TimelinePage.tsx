import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Dataset } from '../data/schema'
import { packLane } from '../domain/packing'
import { createScale } from '../domain/scale'
import { maxVisibleImportance, visibleEntries } from '../domain/visibility'
import { dataYearRange } from '../domain/yearRange'
import { minPxPerYear, type ZoomState, zoomAt } from '../domain/zoom'
import { DetailPanel } from './DetailPanel'
import {
  AXIS_WIDTH,
  CANVAS_PADDING_Y,
  COLUMN_GAP,
  COLUMN_WIDTH,
  DESKTOP_MEDIA_QUERY,
  FALLBACK_VIEWPORT_WIDTH,
  HEADER_HEIGHT,
  LANE_PADDING,
  laneWidth,
  PANEL_HEIGHT_RATIO,
  PANEL_WIDTH_PX,
} from './layout'
import { TimelineView } from './TimelineView'
import { TopBar } from './TopBar'
import { ZoomControls } from './ZoomControls'

const FALLBACK_VIEWPORT_HEIGHT = 800
const BUTTON_ZOOM_FACTOR = 1.4
const WHEEL_ZOOM_FACTOR = 1.2

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { regions, entries } = dataset
  const yearRange = useMemo(() => dataYearRange(entries), [entries])
  const totalYears = yearRange.maxYear - yearRange.minYear
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [zoom, setZoom] = useState<ZoomState>({
    pxPerYear: minPxPerYear(totalYears, FALLBACK_VIEWPORT_HEIGHT),
    scrollTop: 0,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const hasUserZoomedRef = useRef(false)

  useEffect(() => {
    const measure = () =>
      setViewportHeight(containerRef.current?.clientHeight || FALLBACK_VIEWPORT_HEIGHT)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

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

  const applyZoomAtContainerOffset = useCallback(
    (factor: number, containerOffset: number) => {
      applyZoom(factor, containerOffset - HEADER_HEIGHT - CANVAS_PADDING_Y)
    },
    [applyZoom],
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
    () => createScale(yearRange.minYear, yearRange.maxYear, zoom.pxPerYear),
    [yearRange, zoom.pxPerYear],
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

  const [pendingJump, setPendingJump] = useState<{ id: string } | null>(null)

  const jumpToEntry = useCallback((id: string) => {
    setSelectedId(id)
    setPendingJump({ id })
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
    setPendingJump(null)
    if (!entry || !container) return
    const viewport = visibleViewport(true)
    const laneIndex = regions.findIndex((r) => r.id === entry.region)
    const positioned = laneLayouts
      .get(entry.region)
      ?.positioned.find((p) => p.entry.id === entry.id)
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
        (entry.start - yearRange.minYear) * prev.pxPerYear - viewport.height / 2,
      ),
    }))
  }, [pendingJump, entries, regions, laneLayouts, laneOffsets, yearRange, visibleViewport])

  const jumpToYear = useCallback(
    (year: number) => {
      const viewport = visibleViewport(selectedId !== null)
      setZoom((prev) => ({
        ...prev,
        scrollTop: Math.max(0, (year - yearRange.minYear) * prev.pxPerYear - viewport.height / 2),
      }))
    },
    [yearRange.minYear, selectedId, visibleViewport],
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
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const handlePointerMove = (e: ReactPointerEvent) => {
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
      applyZoomAtContainerOffset(
        e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR,
        e.clientY - rect.top,
      )
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [applyZoomAtContainerOffset])

  return (
    <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}>
      <TopBar entries={entries} onJumpToYear={jumpToYear} onSelectEntry={jumpToEntry} />
      <TimelineView
        containerRef={containerRef}
        dataset={dataset}
        scale={scale}
        yearRange={yearRange}
        laneLayouts={laneLayouts}
        laneWidths={laneWidths}
        laneOffsets={laneOffsets}
        panelOpen={panelOpen}
        inView={inView}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop
          setZoom((prev) => (prev.scrollTop === scrollTop ? prev : { ...prev, scrollTop }))
        }}
        viewportTopY={zoom.scrollTop}
      />
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
    </div>
  )
}
