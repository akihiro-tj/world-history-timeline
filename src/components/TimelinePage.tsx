import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dataset } from '../data/schema'
import { dataYearRange, padYearRange } from '../domain/yearRange'
import { useColorTheme } from '../hooks/useColorTheme'
import { useEdgeFades } from '../hooks/useEdgeFades'
import { useEntryJump } from '../hooks/useEntryJump'
import { useOnboarding } from '../hooks/useOnboarding'
import { usePointerGestures } from '../hooks/usePointerGestures'
import { useTimelineLayout } from '../hooks/useTimelineLayout'
import { useTimelineZoom } from '../hooks/useTimelineZoom'
import { DetailPanel } from './DetailPanel'
import { AXIS_WIDTH, TOP_BAR_HEIGHT } from './layout'
import { TimelineView } from './TimelineView'
import { TopBar } from './TopBar'
import { WelcomeOverlay } from './WelcomeOverlay'
import { ZoomControls } from './ZoomControls'

const BUTTON_ZOOM_FACTOR = 1.4

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { regions, entries } = dataset
  const tickRange = useMemo(() => dataYearRange(entries), [entries])
  const scaleRange = useMemo(() => padYearRange(tickRange), [tickRange])
  const totalYears = scaleRange.maxYear - scaleRange.minYear
  const containerRef = useRef<HTMLDivElement>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  )
  const panelOpen = selectedEntry !== null

  const onboarding = useOnboarding()
  const { theme, toggleTheme } = useColorTheme()
  const { edgeFades, updateEdgeFades } = useEdgeFades()
  const { viewportHeight, zoom, applyZoom, fitAll, updateScrollTop } = useTimelineZoom({
    containerRef,
    totalYears,
    minYear: scaleRange.minYear,
    panelOpen,
    updateEdgeFades,
  })
  const {
    scale,
    laneLayouts,
    laneWidths,
    laneOffsets,
    groupLabels,
    showGroupRow,
    headerHeightPx,
    inView,
  } = useTimelineLayout({
    regions,
    entries,
    scaleRange,
    zoom,
    viewportHeight,
    selectedId,
    selectedEntry,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: zoom / laneWidths / viewportHeight are triggers to re-measure after the DOM's scroll dimensions change
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

  const { isDragging, handlePointerDown, handlePointerMove, shouldSuppressClick } =
    usePointerGestures({
      containerRef,
      isHelpOpen: onboarding.isHelpOpen,
      applyZoomAtContainerOffset,
    })

  const { jumpToEntry, selectEntry, jumpToYear } = useEntryJump({
    containerRef,
    entries,
    regions,
    laneLayouts,
    laneOffsets,
    minYear: scaleRange.minYear,
    viewportHeight,
    selectedId,
    setSelectedId,
    updateScrollTop,
  })

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={(e) => {
        if (shouldSuppressClick()) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <TopBar
        entries={entries}
        onJumpToYear={jumpToYear}
        onSelectEntry={jumpToEntry}
        onOpenHelp={onboarding.openHelp}
        theme={theme}
        onToggleTheme={toggleTheme}
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
          updateScrollTop((prev) => (prev.scrollTop === el.scrollTop ? null : el.scrollTop))
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
        onFitAll={fitAll}
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
      {onboarding.isHelpOpen && <WelcomeOverlay onClose={onboarding.closeHelp} />}
    </div>
  )
}
