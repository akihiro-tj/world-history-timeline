import type { Region } from '../data/schema'
import {
  AXIS_WIDTH,
  COLUMN_GAP,
  COLUMN_WIDTH,
  columnX,
  GROUP_HEADER_HEIGHT,
  HEADER_HEIGHT,
} from './layout'

type LabelRun = {
  label: string
  startColumn: number
  span: number
}

function mergeLabelRuns(labels: (string | null)[]): LabelRun[] {
  const runs: LabelRun[] = []
  labels.forEach((label, column) => {
    if (label === null) return
    const last = runs[runs.length - 1]
    if (last && last.label === label && last.startColumn + last.span === column) {
      last.span += 1
      return
    }
    runs.push({ label, startColumn: column, span: 1 })
  })
  return runs
}

type Props = {
  regions: Region[]
  widths: number[]
  groupLabels: (string | null)[][]
  showGroupRow: boolean
}

export function LaneHeaders({ regions, widths, groupLabels, showGroupRow }: Props) {
  return (
    <div className="sticky top-0 z-20 w-max border-b border-line bg-panel">
      <div className="flex" role="row">
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
      {showGroupRow && (
        <div className="flex" role="row">
          <div className="sticky left-0 z-10 shrink-0 bg-panel" style={{ width: AXIS_WIDTH }} />
          {regions.map((region, i) => {
            // Why: groupLabels is built with the same order and length as regions,
            // so a corresponding element always exists for each region
            const labels = groupLabels[i]
            if (!labels) return null
            return (
              <div
                key={region.id}
                className="relative"
                style={{ width: widths[i], height: GROUP_HEADER_HEIGHT }}
              >
                {mergeLabelRuns(labels).map((run) => (
                  <div
                    key={run.startColumn}
                    className="absolute top-0 truncate text-center text-[11px] leading-5 text-muted"
                    style={{
                      left: columnX(0, run.startColumn),
                      width: run.span * COLUMN_WIDTH + (run.span - 1) * COLUMN_GAP,
                    }}
                  >
                    {run.label}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
