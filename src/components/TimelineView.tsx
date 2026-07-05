import type { ReactNode, RefObject, UIEvent } from 'react'
import type { Dataset } from '../data/schema'
import type { LaneLayout } from '../domain/packing'
import type { Scale } from '../domain/scale'
import type { YearRange } from '../domain/yearRange'
import { EntryBar } from './EntryBar'
import { EventMarker } from './EventMarker'
import { LaneHeaders } from './LaneHeaders'
import { TimeAxis } from './TimeAxis'

type Props = {
  containerRef: RefObject<HTMLDivElement | null>
  dataset: Dataset
  scale: Scale
  yearRange: YearRange
  laneLayouts: Map<string, LaneLayout>
  laneWidths: number[]
  laneOffsets: number[]
  groupLabels: (string | null)[][]
  showGroupRow: boolean
  panelOpen: boolean
  dragging: boolean
  inView: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
  onScroll: (e: UIEvent<HTMLDivElement>) => void
  viewportTopY: number
  children?: ReactNode
}

export function TimelineView({
  containerRef,
  dataset,
  scale,
  yearRange,
  laneLayouts,
  laneWidths,
  laneOffsets,
  groupLabels,
  showGroupRow,
  panelOpen,
  dragging,
  inView,
  selectedId,
  onSelect,
  onScroll,
  viewportTopY,
  children,
}: Props) {
  const { regions } = dataset
  const svgWidth = laneWidths.reduce((sum, width) => sum + width, 0)

  return (
    <div
      ref={containerRef}
      data-testid="timeline-scroll"
      className={`mt-12 h-[calc(100dvh-3rem)] overflow-auto ${
        dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
      } ${panelOpen ? 'pb-[50dvh] md:pr-80 md:pb-0' : ''}`}
      style={{ touchAction: 'pan-x pan-y' }}
      onScroll={onScroll}
    >
      <LaneHeaders
        regions={regions}
        widths={laneWidths}
        groupLabels={groupLabels}
        showGroupRow={showGroupRow}
      />
      <div className="flex w-max" style={{ paddingRight: 64 }}>
        <TimeAxis scale={scale} minYear={yearRange.minYear} maxYear={yearRange.maxYear} />
        <svg width={svgWidth} height={scale.totalHeight} aria-label="年表">
          {regions.map((region, i) => {
            const layout = laneLayouts.get(region.id)
            if (!layout) return null
            return (
              <g key={region.id}>
                <rect
                  x={laneOffsets[i]}
                  y={0}
                  width={laneWidths[i]}
                  height={scale.totalHeight}
                  fill={region.color}
                  opacity={0.06}
                />
                {layout.positioned
                  .filter((p) => inView.has(p.entry.id))
                  .map((p) =>
                    p.entry.end === undefined ? (
                      <EventMarker
                        key={p.entry.id}
                        entry={p.entry}
                        laneX={laneOffsets[i]}
                        column={p.column}
                        scale={scale}
                        selected={p.entry.id === selectedId}
                        onSelect={onSelect}
                        svgWidth={svgWidth}
                      />
                    ) : (
                      <EntryBar
                        key={p.entry.id}
                        entry={p.entry}
                        laneX={laneOffsets[i]}
                        column={p.column}
                        scale={scale}
                        selected={p.entry.id === selectedId}
                        onSelect={onSelect}
                        viewportTopY={viewportTopY}
                      />
                    ),
                  )}
              </g>
            )
          })}
        </svg>
      </div>
      {children}
    </div>
  )
}
