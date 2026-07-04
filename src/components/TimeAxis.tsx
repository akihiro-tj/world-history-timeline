import { formatYear } from '../domain/format'
import type { Scale } from '../domain/scale'
import { generateTicks, tickInterval } from '../domain/ticks'
import { AXIS_WIDTH } from './layout'

type Props = {
  scale: Scale
  minYear: number
  maxYear: number
}

export function TimeAxis({ scale, minYear, maxYear }: Props) {
  const ticks = generateTicks(minYear, maxYear, tickInterval(scale.pxPerYear))
  return (
    <div className="sticky left-0 z-10 shrink-0 bg-surface" style={{ width: AXIS_WIDTH }}>
      <svg width={AXIS_WIDTH} height={scale.totalHeight} aria-hidden="true">
        {ticks.map((year) => (
          <g key={year}>
            <line
              x1={AXIS_WIDTH - 8}
              x2={AXIS_WIDTH}
              y1={scale.yearToY(year)}
              y2={scale.yearToY(year)}
              stroke="var(--color-line)"
            />
            <text
              x={AXIS_WIDTH - 12}
              y={scale.yearToY(year) + 4}
              textAnchor="end"
              className="fill-muted text-[11px]"
            >
              {formatYear(year)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
