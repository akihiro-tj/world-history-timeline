import type { Region } from '../data/schema'
import { AXIS_WIDTH, HEADER_HEIGHT } from './layout'

type Props = {
  regions: Region[]
  widths: number[]
}

export function LaneHeaders({ regions, widths }: Props) {
  return (
    <div className="sticky top-0 z-20 flex w-max border-b border-line bg-panel" role="row">
      <div className="sticky left-0 z-10 shrink-0 bg-panel" style={{ width: AXIS_WIDTH }} />
      {regions.map((region, i) => (
        <div
          key={region.id}
          role="columnheader"
          className="flex items-center justify-center text-sm font-medium"
          style={{
            width: widths[i],
            height: HEADER_HEIGHT,
            borderTop: `3px solid ${region.color}`,
          }}
        >
          {region.name}
        </div>
      ))}
    </div>
  )
}
