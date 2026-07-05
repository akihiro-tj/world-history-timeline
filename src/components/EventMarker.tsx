import type { Entry } from '../data/schema'
import { formatYear } from '../domain/format'
import type { Scale } from '../domain/scale'
import { columnX } from './layout'

type Props = {
  entry: Entry
  laneX: number
  column: number
  scale: Scale
  selected: boolean
  onSelect: (id: string) => void
}

export function EventMarker({ entry, laneX, column, scale, selected, onSelect }: Props) {
  const y = scale.yearToY(entry.start)
  const x = columnX(laneX, column)
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${entry.title} ${formatYear(entry.start)}`}
      aria-pressed={selected}
      className="cursor-pointer"
      onClick={() => onSelect(entry.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(entry.id)
        }
      }}
    >
      <path
        d={`M ${x + 6} ${y - 6} L ${x + 12} ${y} L ${x + 6} ${y + 6} L ${x} ${y} Z`}
        fill="var(--color-event)"
        stroke={selected ? 'var(--color-ink)' : 'none'}
        strokeWidth={selected ? 2 : 0}
      />
      <text x={x + 16} y={y + 4} className="pointer-events-none fill-ink text-[11px]">
        {entry.title}
      </text>
    </g>
  )
}
