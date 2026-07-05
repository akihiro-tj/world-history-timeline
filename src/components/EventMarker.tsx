import type { Entry } from '../data/schema'
import { formatYear } from '../domain/format'
import { truncateLabel } from '../domain/label'
import type { Scale } from '../domain/scale'
import { columnX } from './layout'

const LABEL_FONT_SIZE_PX = 11
const LABEL_OFFSET_X = 16
const LABEL_MARGIN_RIGHT = 4

type Props = {
  entry: Entry
  laneX: number
  column: number
  scale: Scale
  selected: boolean
  onSelect: (id: string) => void
  svgWidth: number
}

export function EventMarker({ entry, laneX, column, scale, selected, onSelect, svgWidth }: Props) {
  const y = scale.yearToY(entry.start)
  const x = columnX(laneX, column)
  const labelMaxWidth = svgWidth - (x + LABEL_OFFSET_X) - LABEL_MARGIN_RIGHT
  const diamondPath = `M ${x + 6} ${y - 6} L ${x + 12} ${y} L ${x + 6} ${y + 6} L ${x} ${y} Z`
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
      <title>{entry.title}</title>
      <path d={diamondPath} fill="var(--color-event)" />
      {selected && (
        <>
          <path d={diamondPath} fill="none" stroke="var(--color-panel)" strokeWidth={6} />
          <path d={diamondPath} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} />
        </>
      )}
      <text x={x + LABEL_OFFSET_X} y={y + 4} className="fill-ink text-[11px]">
        {truncateLabel(entry.title, labelMaxWidth, LABEL_FONT_SIZE_PX)}
      </text>
    </g>
  )
}
