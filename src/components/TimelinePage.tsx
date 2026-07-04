import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dataset } from '../data/schema'
import { packLane } from '../domain/packing'
import { createScale } from '../domain/scale'
import { maxVisibleImportance, visibleEntries } from '../domain/visibility'
import { minPxPerYear } from '../domain/zoom'
import { TimelineView } from './TimelineView'

const FALLBACK_VIEWPORT_HEIGHT = 800

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { config, regions, entries } = dataset
  const totalYears = config.maxYear - config.minYear
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [pxPerYear] = useState(() => minPxPerYear(totalYears, FALLBACK_VIEWPORT_HEIGHT))
  const [scrollTop, setScrollTop] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const measure = () =>
      setViewportHeight(containerRef.current?.clientHeight || FALLBACK_VIEWPORT_HEIGHT)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const scale = useMemo(
    () => createScale(config.minYear, config.maxYear, pxPerYear),
    [config, pxPerYear],
  )
  const maxImportance = maxVisibleImportance(pxPerYear)
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
    const marginYears = viewportHeight / pxPerYear
    const topYear = scale.yToYear(scrollTop) - marginYears
    const bottomYear = scale.yToYear(scrollTop + viewportHeight) + marginYears
    return new Set(visibleEntries(tierEntries, topYear, bottomYear, maxImportance).map((e) => e.id))
  }, [tierEntries, scale, scrollTop, viewportHeight, pxPerYear, maxImportance])

  return (
    <TimelineView
      containerRef={containerRef}
      dataset={dataset}
      scale={scale}
      laneLayouts={laneLayouts}
      inView={inView}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      onWheel={() => {}}
      viewportTopY={scrollTop}
    />
  )
}
