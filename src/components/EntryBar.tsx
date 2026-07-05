import type { Entry } from '../data/schema'
import { formatSpan } from '../domain/format'
import type { Scale } from '../domain/scale'
import { COLUMN_WIDTH, columnX, LABEL_MIN_HEIGHT } from './layout'

const TYPE_FILL: Record<Entry['type'], string> = {
  ruler: 'var(--color-ruler)',
  person: 'var(--color-person)',
  event: 'var(--color-event)',
}

type Props = {
  entry: Entry
  laneX: number
  column: number
  scale: Scale
  selected: boolean
  onSelect: (id: string) => void
  viewportTopY: number
}

export function EntryBar({ entry, laneX, column, scale, selected, onSelect, viewportTopY }: Props) {
  const top = scale.yearToY(entry.start)
  const bottom = scale.yearToY(entry.end ?? entry.start)
  const height = Math.max(bottom - top, 2)
  const x = columnX(laneX, column)
  const showLabel = height >= LABEL_MIN_HEIGHT
  const labelY = Math.min(Math.max(top + 4, viewportTopY + 4), bottom - LABEL_MIN_HEIGHT)
  return (
    <g>
      <rect
        role="button"
        tabIndex={0}
        aria-label={`${entry.title} ${formatSpan(entry.start, entry.end)}`}
        aria-pressed={selected}
        x={x}
        y={top}
        width={COLUMN_WIDTH}
        height={height}
        rx={4}
        fill={TYPE_FILL[entry.type]}
        opacity={selected ? 1 : 0.85}
        stroke={selected ? 'var(--color-ink)' : 'none'}
        strokeWidth={selected ? 2 : 0}
        className="cursor-pointer"
        onClick={() => onSelect(entry.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(entry.id)
          }
        }}
      />
      {showLabel && (
        <text
          x={x + 6}
          y={labelY + 11}
          className="pointer-events-none fill-white text-[11px] font-medium"
        >
          {entry.title}
        </text>
      )}
    </g>
  )
}
