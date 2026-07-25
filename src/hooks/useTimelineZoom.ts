import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  clampPxPerYear,
  INITIAL_FOCUS_YEAR,
  initialPxPerYear,
  minPxPerYear,
  type ZoomState,
  zoomAt,
} from '../domain/zoom'

const FALLBACK_VIEWPORT_HEIGHT = 800

type ZoomMode = { kind: 'auto' } | { kind: 'manual' }

export function useTimelineZoom({
  containerRef,
  totalYears,
  minYear,
  panelOpen,
  updateEdgeFades,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  totalYears: number
  minYear: number
  panelOpen: boolean
  updateEdgeFades: (container: HTMLDivElement) => void
}) {
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [zoom, setZoom] = useState<ZoomState>(() => {
    const pxPerYear = clampPxPerYear(
      initialPxPerYear(FALLBACK_VIEWPORT_HEIGHT),
      totalYears,
      FALLBACK_VIEWPORT_HEIGHT,
    )
    return {
      pxPerYear,
      scrollTop: Math.max(
        0,
        (INITIAL_FOCUS_YEAR - minYear) * pxPerYear - FALLBACK_VIEWPORT_HEIGHT / 2,
      ),
    }
  })
  const zoomModeRef = useRef<ZoomMode>({ kind: 'auto' })

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current
      setViewportHeight(container?.clientHeight || FALLBACK_VIEWPORT_HEIGHT)
      if (container) updateEdgeFades(container)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [containerRef, updateEdgeFades])

  useEffect(() => {
    const container = containerRef.current
    if (container && container.scrollTop !== zoom.scrollTop) {
      container.scrollTop = zoom.scrollTop
    }
  }, [containerRef, zoom])

  useEffect(() => {
    if (zoomModeRef.current.kind !== 'auto') return
    setZoom((prev) => {
      const pxPerYear = clampPxPerYear(initialPxPerYear(viewportHeight), totalYears, viewportHeight)
      if (pxPerYear === prev.pxPerYear) return prev
      return { pxPerYear, scrollTop: (prev.scrollTop / prev.pxPerYear) * pxPerYear }
    })
  }, [viewportHeight, totalYears])

  useEffect(() => {
    if (panelOpen) return
    const container = containerRef.current
    if (!container) return
    // Why: While layout hasn't been measured yet (scrollHeight/clientHeight both 0),
    // the content range is unknown, so don't let clamping wipe out the initial scroll position
    if (container.scrollHeight === 0 && container.clientHeight === 0) return
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    if (container.scrollLeft > maxScrollLeft) container.scrollLeft = maxScrollLeft
    if (container.scrollTop > maxScrollTop) {
      container.scrollTop = maxScrollTop
      setZoom((prev) => ({ ...prev, scrollTop: maxScrollTop }))
    }
  }, [panelOpen, containerRef])

  const applyZoom = useCallback(
    (factor: number, anchorOffset: number) => {
      zoomModeRef.current = { kind: 'manual' }
      setZoom((prev) => zoomAt(prev, factor, anchorOffset, totalYears, viewportHeight))
    },
    [totalYears, viewportHeight],
  )

  const fitAll = useCallback(() => {
    zoomModeRef.current = { kind: 'manual' }
    setZoom({ pxPerYear: minPxPerYear(totalYears, viewportHeight), scrollTop: 0 })
  }, [totalYears, viewportHeight])

  const updateScrollTop = useCallback((compute: (prev: ZoomState) => number | null) => {
    setZoom((prev) => {
      const next = compute(prev)
      return next === null ? prev : { ...prev, scrollTop: next }
    })
  }, [])

  return { viewportHeight, zoom, applyZoom, fitAll, updateScrollTop }
}
