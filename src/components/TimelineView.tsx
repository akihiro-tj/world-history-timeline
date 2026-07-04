import type { ReactNode, RefObject, UIEvent, WheelEvent } from 'react'
import type { Dataset } from '../data/schema'
import type { LaneLayout } from '../domain/packing'
import type { Scale } from '../domain/scale'
import { EntryBar } from './EntryBar'
import { EventMarker } from './EventMarker'
import { LaneHeaders } from './LaneHeaders'
import { laneWidth } from './layout'
import { TimeAxis } from './TimeAxis'

type Props = {
  containerRef: RefObject<HTMLDivElement | null>
  dataset: Dataset
  scale: Scale
  laneLayouts: Map<string, LaneLayout>
  inView: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
  onScroll: (e: UIEvent<HTMLDivElement>) => void
  onWheel: (e: WheelEvent<HTMLDivElement>) => void
  viewportTopY: number
  children?: ReactNode
}

export function TimelineView({
  containerRef,
  dataset,
  scale,
  laneLayouts,
  inView,
  selectedId,
  onSelect,
  onScroll,
  onWheel,
  viewportTopY,
  children,
}: Props) {
  const { config, regions } = dataset
  const widths = regions.map((r) => laneWidth(laneLayouts.get(r.id)))
  const offsets: number[] = []
  let acc = 0
  for (const width of widths) {
    offsets.push(acc)
    acc += width
  }

  return (
    <div
      ref={containerRef}
      data-testid="timeline-scroll"
      className="h-dvh overflow-auto"
      onScroll={onScroll}
      onWheel={onWheel}
    >
      <LaneHeaders regions={regions} widths={widths} />
      <div className="flex w-max">
        <TimeAxis scale={scale} minYear={config.minYear} maxYear={config.maxYear} />
        <svg width={acc} height={scale.totalHeight} aria-label="年表">
          {regions.map((region, i) => {
            const layout = laneLayouts.get(region.id)
            if (!layout) return null
            return (
              <g key={region.id}>
                <rect
                  x={offsets[i]}
                  y={0}
                  width={widths[i]}
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
                        laneX={offsets[i]}
                        column={p.column}
                        scale={scale}
                        selected={p.entry.id === selectedId}
                        onSelect={onSelect}
                      />
                    ) : (
                      <EntryBar
                        key={p.entry.id}
                        entry={p.entry}
                        laneX={offsets[i]}
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
