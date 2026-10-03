// 年表の描画。layout.ts の結果（along / cross）を縦か横に当てはめる
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { COPY } from "../app/copy";
import { revealDelta, unionBox } from "../panel/reveal";
import { formatYear } from "./format";
import {
  BAR_THICKNESS,
  type BarLayout,
  LABEL_GAP,
  type LaneLayout,
  LINE_HEIGHT,
  layoutLane,
  type Orientation,
  rangeLength,
  type TimeRange,
  TRACK_GAP,
  ticks,
  VERTICAL_TRACK_WIDTH,
  yearToOffset,
} from "./layout";
import { centerYear, scrollStartFor } from "./scroll";
import type { Row, Span } from "./spans";
import { useTextMeasure } from "./useTextMeasure";

// 見出しの寸法（位置の計算に使う）
const LANE_NAME_HEIGHT = 24; // 横向きの行の名前
const AXIS_HEIGHT = 24; // 横向きの年の目盛り
const HEADER_HEIGHT = 32; // 縦向きの行の見出し
const AXIS_WIDTH = 48; // 縦向きの年の目盛り
const MIN_COLUMN_WIDTH = 120; // 縦向きの 1 行（列）の最小幅

type Props = {
  rows: Row[];
  range: TimeRange | null;
  orientation: Orientation;
  // 現在まで続く棒の終わりの年
  currentYear: number;
  // 棒を選んでいるか、選んだときに呼ぶ関数（element は選んだボタン。閉じたときにフォーカスを戻す）
  isSelected: (row: Row, span: Span) => boolean;
  onSelect: (row: Row, span: Span, element: HTMLElement) => void;
  // 選んだ項目が変わると変わる値。変わったら、選んだ棒を見える位置までスクロールする
  revealKey: string | null;
  // 年表のうち見えている割合（上から）。スマホで下からパネルが開いているときは上側だけが見える
  visibleRatio: number;
  // 年表の下端に足す余白（年表の高さに対する割合）。スマホのシートの下に隠れた棒も、シートより上まで持ち上げられるようにする
  endSpaceRatio: number;
};

export function Timeline({
  rows,
  range,
  orientation,
  currentYear,
  isSelected,
  onSelect,
  revealKey,
  visibleRatio,
  endSpaceRatio,
}: Props) {
  const scrollerRef = useRef<HTMLElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const centerRef = useRef<number | null>(null);
  const measure = useTextMeasure(probeRef);
  const axisOffset = orientation === "vertical" ? HEADER_HEIGHT : 0;

  const lanes = useMemo(() => {
    if (!range || !measure) return null;
    return rows.map((row) => ({
      lane: row,
      layout: layoutLane(row.spans, range, orientation, measure, currentYear),
    }));
  }, [rows, orientation, range, measure, currentYear]);

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

  // 選んだ棒が見えていなければ、見える位置までスクロールする（パネルが開いた後の大きさで測る）
  useEffect(() => {
    const scroller = scrollerRef.current;
    // 全画面に広げたパネルの下では年表が見えないので、スクロールしない
    if (!scroller || revealKey === null || visibleRatio <= 0) return;
    // 選んだ棒（再登板ならすべて）と棒の外のラベルをまとめた範囲を見せる
    const item = unionBox(
      [...scroller.querySelectorAll<HTMLElement>('[data-selected="true"]')].map((element) =>
        element.getBoundingClientRect(),
      ),
    );
    if (!item) return;
    const area = scroller.getBoundingClientRect();
    // 貼り付けた見出し（縦向きの行の見出し・横向きの年の目盛り）の下から測る
    const top = area.top + (orientation === "vertical" ? HEADER_HEIGHT : AXIS_HEIGHT);
    const bottom = area.top + area.height * visibleRatio;
    const left = area.left + (orientation === "vertical" ? AXIS_WIDTH : 0);
    scroller.scrollBy({
      top: revealDelta(item.top, item.bottom, top, bottom),
      left: revealDelta(item.left, item.right, left, area.right),
    });
  }, [revealKey, visibleRatio, orientation]);

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
          <Horizontal range={range} lanes={lanes} isSelected={isSelected} onSelect={onSelect} />
        ) : (
          <Vertical range={range} lanes={lanes} isSelected={isSelected} onSelect={onSelect} />
        ))}
      {endSpaceRatio > 0 && (
        <div aria-hidden="true" style={{ height: `${endSpaceRatio * 100}%` }} />
      )}
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

// 選んだ棒の枠とキーボードのフォーカスの枠は primary の 2px（spec §4）
const selectableClass =
  "cursor-pointer text-left data-[selected=true]:outline-2 data-[selected=true]:outline-offset-1 data-[selected=true]:outline-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

type SelectProps = {
  isSelected: (row: Row, span: Span) => boolean;
  onSelect: (row: Row, span: Span, element: HTMLElement) => void;
};

// 棒の外に出すラベル。引き出し線（横向きは左、縦向きは上の罫線）で棒とつなぐ
function OutsideLabel({
  bar,
  className,
  style,
  selected,
  onSelect,
}: {
  bar: BarLayout;
  className: string;
  style: CSSProperties;
  selected: boolean;
  onSelect: (element: HTMLElement) => void;
}) {
  return (
    // 同じ項目の棒がキーボードで選べるので、ラベルは Tab の順に入れない
    <button
      type="button"
      tabIndex={-1}
      data-selected={selected}
      onClick={(event) => onSelect(event.currentTarget)}
      className={`absolute whitespace-nowrap border-muted font-caption text-caption text-on-surface ${selectableClass} ${className}`}
      style={{ ...textStyle, ...style }}
    >
      <span className="block">{bar.span.name}</span>
      {bar.periodLines.map((line) => (
        <span key={line} className="block text-muted">
          {line}
        </span>
      ))}
    </button>
  );
}

function Horizontal({
  range,
  lanes,
  isSelected,
  onSelect,
}: { range: TimeRange; lanes: LaneEntry[] } & SelectProps) {
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
        const height = LANE_NAME_HEIGHT + layout.crossExtent + TRACK_GAP * 2;
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
              <button
                type="button"
                key={bar.span.id}
                data-selected={isSelected(lane, bar.span)}
                aria-expanded={isSelected(lane, bar.span)}
                aria-label={`${bar.span.name} ${bar.periodLines.join("")}`}
                onClick={(event) => onSelect(lane, bar.span, event.currentTarget)}
                className={`${barClass(i)} ${selectableClass} flex flex-col justify-start px-xs font-caption text-caption`}
                style={{
                  ...textStyle,
                  left: bar.offset + 1,
                  width: Math.max(bar.length - 2, 1),
                  top: LANE_NAME_HEIGHT + bar.cross,
                  height: BAR_THICKNESS,
                  paddingTop: (BAR_THICKNESS - LINE_HEIGHT * 2) / 2,
                }}
              >
                {bar.inside && (
                  <>
                    <span className="block truncate">{bar.span.name}</span>
                    <span className="block truncate">{bar.periodLines[0]}</span>
                  </>
                )}
              </button>
            ))}
            {layout.bars.map(
              (bar) =>
                bar.labelCross !== null && (
                  <OutsideLabel
                    key={bar.span.id}
                    bar={bar}
                    selected={isSelected(lane, bar.span)}
                    onSelect={(element) => onSelect(lane, bar.span, element)}
                    className="border-l"
                    style={{
                      left: bar.offset + 1,
                      top: LANE_NAME_HEIGHT + bar.labelCross,
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

function Vertical({
  range,
  lanes,
  isSelected,
  onSelect,
}: { range: TimeRange; lanes: LaneEntry[] } & SelectProps) {
  const length = contentLength(range, lanes);
  const years = ticks(range);
  return (
    <div
      className="grid"
      style={{
        // 列の最小幅は、見出しの幅と、各列の section の min-width（棒とラベルを並べた幅）の大きいほう。
        // 見出しを切らず、棒とラベルが隣の列にはみ出さない
        gridTemplateColumns: `${AXIS_WIDTH}px repeat(${lanes.length}, minmax(max-content, 1fr))`,
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
          <span className="whitespace-nowrap">{lane.name}</span>
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
        return (
          <section
            key={lane.id}
            aria-label={lane.name}
            className="relative border-l border-border"
            style={{
              height: length,
              minWidth: Math.max(MIN_COLUMN_WIDTH, layout.crossExtent + TRACK_GAP * 2),
            }}
          >
            {years.map((year) => (
              <div
                key={year}
                className="absolute right-0 left-0 border-t border-grid"
                style={{ top: yearToOffset(year, range) }}
              />
            ))}
            {layout.bars.map((bar, i) => (
              <button
                type="button"
                key={bar.span.id}
                data-selected={isSelected(lane, bar.span)}
                aria-expanded={isSelected(lane, bar.span)}
                aria-label={`${bar.span.name} ${bar.periodLines.join("")}`}
                onClick={(event) => onSelect(lane, bar.span, event.currentTarget)}
                className={`${barClass(i)} ${selectableClass} flex flex-col justify-start px-xs font-caption text-caption`}
                style={{
                  ...textStyle,
                  top: bar.offset + 1,
                  height: Math.max(bar.length - 2, 1),
                  left: bar.cross + TRACK_GAP,
                  width: VERTICAL_TRACK_WIDTH,
                  paddingTop: 1,
                }}
              >
                {bar.inside === "row" && (
                  <span className="block truncate">
                    {bar.span.name}
                    <span className="ml-xs text-muted">{bar.periodLines[0]}</span>
                  </span>
                )}
                {bar.inside === "stack" && (
                  <>
                    <span className="block">{bar.span.name}</span>
                    {bar.periodLines.map((line) => (
                      <span key={line} className="block text-muted">
                        {line}
                      </span>
                    ))}
                  </>
                )}
              </button>
            ))}
            {layout.bars.map(
              (bar) =>
                bar.labelCross !== null && (
                  <OutsideLabel
                    key={bar.span.id}
                    bar={bar}
                    selected={isSelected(lane, bar.span)}
                    onSelect={(element) => onSelect(lane, bar.span, element)}
                    className="border-t"
                    style={{
                      top: bar.offset + 1,
                      left: bar.labelCross + TRACK_GAP,
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
