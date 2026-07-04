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
import { minPxPerYear, type ZoomState, zoomAt } from '../domain/zoom'
import { DetailPanel } from './DetailPanel'
import { SearchBar } from './SearchBar'
import { TimelineView } from './TimelineView'
import { ZoomControls } from './ZoomControls'

const FALLBACK_VIEWPORT_HEIGHT = 800
const BUTTON_ZOOM_FACTOR = 1.4
const WHEEL_ZOOM_FACTOR = 1.2

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { config, regions, entries } = dataset
  const totalYears = config.maxYear - config.minYear
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [zoom, setZoom] = useState<ZoomState>({
    pxPerYear: minPxPerYear(totalYears, FALLBACK_VIEWPORT_HEIGHT),
    scrollTop: 0,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

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

  const applyZoom = useCallback(
    (factor: number, anchorOffset: number) => {
      setZoom((prev) => zoomAt(prev, factor, anchorOffset, totalYears, viewportHeight))
    },
    [totalYears, viewportHeight],
  )

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  )

  const jumpToEntry = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id)
      if (!entry) return
      setSelectedId(id)
      setZoom((prev) => ({
        ...prev,
        scrollTop: Math.max(
          0,
          (entry.start - config.minYear) * prev.pxPerYear - viewportHeight / 2,
        ),
      }))
    },
    [entries, config.minYear, viewportHeight],
  )

  const jumpToYear = useCallback(
    (year: number) => {
      setZoom((prev) => ({
        ...prev,
        scrollTop: Math.max(0, (year - config.minYear) * prev.pxPerYear - viewportHeight / 2),
      }))
    },
    [config.minYear, viewportHeight],
  )

  const scale = useMemo(
    () => createScale(config.minYear, config.maxYear, zoom.pxPerYear),
    [config, zoom.pxPerYear],
  )
  const maxImportance = maxVisibleImportance(zoom.pxPerYear)
  const tierEntries = useMemo(
    () => entries.filter((e) => e.importance <= maxImportance),
    [entries, maxImportance],
  )
  const laneLayouts = useMemo(
    () =>
      new Map(regions.map((r) => [r.id, packLane(tierEntries.filter((e) => e.region === r.id))])),
    [regions, tierEntries],
  )
  const inView = useMemo(() => {
    const marginYears = viewportHeight / zoom.pxPerYear
    const topYear = scale.yToYear(zoom.scrollTop) - marginYears
    const bottomYear = scale.yToYear(zoom.scrollTop + viewportHeight) + marginYears
    return new Set(visibleEntries(tierEntries, topYear, bottomYear, maxImportance).map((e) => e.id))
  }, [tierEntries, scale, zoom, viewportHeight, maxImportance])

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
      applyZoom(distanceAfter / distanceBefore, anchorOffset)
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

  return (
    <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}>
      <SearchBar entries={entries} onJumpToYear={jumpToYear} onSelectEntry={jumpToEntry} />
      <TimelineView
        containerRef={containerRef}
        dataset={dataset}
        scale={scale}
        laneLayouts={laneLayouts}
        inView={inView}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop
          setZoom((prev) => (prev.scrollTop === scrollTop ? prev : { ...prev, scrollTop }))
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          applyZoom(e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR, e.clientY - rect.top)
        }}
        viewportTopY={zoom.scrollTop}
      />
      <ZoomControls
        onZoomIn={() => applyZoom(BUTTON_ZOOM_FACTOR, viewportHeight / 2)}
        onZoomOut={() => applyZoom(1 / BUTTON_ZOOM_FACTOR, viewportHeight / 2)}
        onFitAll={() =>
          setZoom({ pxPerYear: minPxPerYear(totalYears, viewportHeight), scrollTop: 0 })
        }
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
