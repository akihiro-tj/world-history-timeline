// 年表の描画。layout.ts の結果（along / cross）を縦か横に当てはめる
import { type CSSProperties, useLayoutEffect, useMemo, useRef } from "react";
import { COPY } from "../app/copy";
import { formatYear } from "./format";
import {
  BAR_THICKNESS,
  type BarLayout,
  LABEL_GAP,
  type LaneLayout,
  LINE_HEIGHT,
  labelRowStart,
  labelRowsTotal,
  layoutLane,
  type Orientation,
  rangeLength,
  type TimeRange,
  TRACK_GAP,
  ticks,
  yearToOffset,
} from "./layout";
import { centerYear, scrollStartFor } from "./scroll";
import type { Row } from "./spans";
import { useTextMeasure } from "./useTextMeasure";

// 見出しの寸法（位置の計算に使う）
const LANE_NAME_HEIGHT = 24; // 横向きの行の名前
const AXIS_HEIGHT = 24; // 横向きの年の目盛り
const HEADER_HEIGHT = 32; // 縦向きの行の見出し
const AXIS_WIDTH = 48; // 縦向きの年の目盛り
const MIN_COLUMN_WIDTH = 120; // 縦向きの 1 行（列）の最小幅

type Props = { rows: Row[]; range: TimeRange | null; orientation: Orientation };

export function Timeline({ rows, range, orientation }: Props) {
  const scrollerRef = useRef<HTMLElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const centerRef = useRef<number | null>(null);
  const measure = useTextMeasure(probeRef);
  const axisOffset = orientation === "vertical" ? HEADER_HEIGHT : 0;

  const lanes = useMemo(() => {
    if (!range || !measure) return null;
    return rows.map((row) => ({
      lane: row,
      layout: layoutLane(row.spans, range, orientation, measure),
    }));
  }, [rows, orientation, range, measure]);

  // 切り替えの前に中央にあった年を、切り替えの後も中央に置く
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !range || !lanes) return;
    const year = centerRef.current;
    // まだスクロールしていなければ、いまの中央の年を覚えておく
    if (year === null) {
      centerRef.current = currentCenter(scroller, orientation, axisOffset, range);
      return;
    }
    if (orientation === "vertical") {
      scroller.scrollTop = scrollStartFor(
        year,
        scroller.clientHeight,
        axisOffset,
        range,
        scroller.scrollHeight - scroller.clientHeight,
      );
    } else {
      scroller.scrollLeft = scrollStartFor(
        year,
        scroller.clientWidth,
        axisOffset,
        range,
        scroller.scrollWidth - scroller.clientWidth,
      );
    }
  }, [orientation, range, lanes, axisOffset]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller || !range) return;
    centerRef.current = currentCenter(scroller, orientation, axisOffset, range);
  }

  return (
    <section
      ref={scrollerRef}
      onScroll={handleScroll}
      aria-label={COPY.timelineLabel}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: キーボードでスクロールできるようにする
      tabIndex={0}
      className="relative h-full overflow-auto focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span
        ref={probeRef}
        aria-hidden="true"
        className="invisible absolute font-caption text-caption"
      >
        あ
      </span>
      {range &&
        lanes &&
        (orientation === "horizontal" ? (
          <Horizontal range={range} lanes={lanes} />
        ) : (
          <Vertical range={range} lanes={lanes} />
        ))}
    </section>
  );
}

function currentCenter(
  scroller: HTMLElement,
  orientation: Orientation,
  axisOffset: number,
  range: TimeRange,
): number {
  return orientation === "vertical"
    ? centerYear(scroller.scrollTop, scroller.clientHeight, axisOffset, range)
    : centerYear(scroller.scrollLeft, scroller.clientWidth, axisOffset, range);
}

type LaneEntry = { lane: Row; layout: LaneLayout };

function contentLength(range: TimeRange, lanes: LaneEntry[]): number {
  return Math.max(rangeLength(range), ...lanes.map(({ layout }) => layout.extent));
}

function barClass(index: number): string {
  return `absolute overflow-hidden rounded-sm text-on-bar ${index % 2 === 0 ? "bg-bar-a" : "bg-bar-b"}`;
}

const textStyle: CSSProperties = { lineHeight: `${LINE_HEIGHT}px` };

// 棒の外に出すラベル。引き出し線（横向きは左、縦向きは上の罫線）で棒とつなぐ
function OutsideLabel({
  bar,
  className,
  style,
}: {
  bar: BarLayout;
  className: string;
  style: CSSProperties;
}) {
  return (
    <div
      className={`absolute whitespace-nowrap border-muted font-caption text-caption text-on-surface ${className}`}
      style={{ ...textStyle, ...style }}
    >
      <div>{bar.span.name}</div>
      <div className="text-muted">{bar.period}</div>
    </div>
  );
}

function Horizontal({ range, lanes }: { range: TimeRange; lanes: LaneEntry[] }) {
  const length = contentLength(range, lanes);
  const years = ticks(range);
  return (
    <div className="relative" style={{ width: length }}>
      <div
        className="sticky top-0 z-20 border-b border-border bg-surface"
        style={{ height: AXIS_HEIGHT }}
      >
        {years.map((year) => (
          <span
            key={year}
            className="absolute top-xs pl-xs font-caption text-caption text-muted"
            style={{ left: yearToOffset(year, range) }}
          >
            {formatYear({ year, circa: false })}
          </span>
        ))}
      </div>
      {lanes.map(({ lane, layout }) => {
        const barsEnd = LANE_NAME_HEIGHT + layout.trackCount * (BAR_THICKNESS + TRACK_GAP);
        const height = barsEnd + labelRowsTotal(layout.labelRowSizes) + TRACK_GAP;
        return (
          <section key={lane.id} className="relative border-b border-border" style={{ height }}>
            {years.map((year) => (
              <div
                key={year}
                className="absolute top-0 bottom-0 border-l border-grid"
                style={{ left: yearToOffset(year, range) }}
              />
            ))}
            <h2 className="sticky left-0 z-10 inline-block border-r border-b border-border bg-surface px-sm font-heading text-heading">
              {lane.name}
            </h2>
            {layout.bars.map((bar, i) => (
              <div
                key={bar.span.id}
                className={`${barClass(i)} px-xs font-caption text-caption`}
                style={{
                  ...textStyle,
                  left: bar.offset + 1,
                  width: Math.max(bar.length - 2, 1),
                  top: LANE_NAME_HEIGHT + bar.track * (BAR_THICKNESS + TRACK_GAP),
                  height: BAR_THICKNESS,
                  paddingTop: (BAR_THICKNESS - LINE_HEIGHT * 2) / 2,
                }}
              >
                {bar.labelRow === null && (
                  <>
                    <div className="truncate">{bar.span.name}</div>
                    <div className="truncate">{bar.period}</div>
                  </>
                )}
              </div>
            ))}
            {layout.bars.map(
              (bar) =>
                bar.labelRow !== null && (
                  <OutsideLabel
                    key={bar.span.id}
                    bar={bar}
                    className="border-l"
                    style={{
                      left: bar.offset + 1,
                      top: barsEnd + labelRowStart(layout.labelRowSizes, bar.labelRow),
                      paddingLeft: LABEL_GAP / 2,
                    }}
                  />
                ),
            )}
          </section>
        );
      })}
    </div>
  );
}

function Vertical({ range, lanes }: { range: TimeRange; lanes: LaneEntry[] }) {
  const length = contentLength(range, lanes);
  const years = ticks(range);
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `${AXIS_WIDTH}px repeat(${lanes.length}, minmax(${MIN_COLUMN_WIDTH}px, 1fr))`,
      }}
    >
      <div
        className="sticky top-0 left-0 z-30 border-b border-border bg-surface"
        style={{ height: HEADER_HEIGHT }}
      />
      {lanes.map(({ lane }) => (
        <h2
          key={lane.id}
          className="sticky top-0 z-20 flex items-center border-b border-l border-border bg-surface px-sm font-heading text-heading"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="truncate">{lane.name}</span>
        </h2>
      ))}
      <div className="sticky left-0 z-10 bg-surface" style={{ height: length }}>
        {years.map((year) => (
          <span
            key={year}
            className="absolute left-xs font-caption text-caption text-muted"
            style={{ top: yearToOffset(year, range) }}
          >
            {formatYear({ year, circa: false })}
          </span>
        ))}
      </div>
      {lanes.map(({ lane, layout }) => {
        const reserve = labelRowsTotal(layout.labelRowSizes);
        const tracks = Math.max(layout.trackCount, 1);
        return (
          <section
            key={lane.id}
            aria-label={lane.name}
            className="relative border-l border-border"
            style={{ height: length }}
          >
            {years.map((year) => (
              <div
                key={year}
                className="absolute right-0 left-0 border-t border-grid"
                style={{ top: yearToOffset(year, range) }}
              />
            ))}
            {layout.bars.map((bar, i) => (
              <div
                key={bar.span.id}
                className={`${barClass(i)} truncate px-xs font-caption text-caption`}
                style={{
                  ...textStyle,
                  top: bar.offset + 1,
                  height: Math.max(bar.length - 2, 1),
                  left: `calc(${bar.track} * (100% - ${reserve}px) / ${tracks} + ${TRACK_GAP}px)`,
                  width: `calc((100% - ${reserve}px) / ${tracks} - ${TRACK_GAP * 2}px)`,
                  paddingTop: 1,
                }}
              >
                {bar.labelRow === null && (
                  <>
                    {bar.span.name}
                    <span className="ml-xs text-muted">{bar.period}</span>
                  </>
                )}
              </div>
            ))}
            {layout.bars.map(
              (bar) =>
                bar.labelRow !== null && (
                  <OutsideLabel
                    key={bar.span.id}
                    bar={bar}
                    className="border-t"
                    style={{
                      top: bar.offset + 1,
                      left: `calc(100% - ${reserve}px + ${labelRowStart(layout.labelRowSizes, bar.labelRow)}px)`,
                      paddingTop: LABEL_GAP / 2,
                    }}
                  />
                ),
            )}
          </section>
        );
      })}
    </div>
  );
}
