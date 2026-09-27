// 年表の位置の計算。向き（縦／横）に依存しない形で、時間軸方向（along）と
// それに直交する方向（cross）の値を返す。描画側がこれを縦か横に当てはめる
import type { TimelineData } from "../data/timeline";
import { formatPeriod } from "./format";
import type { Span } from "./spans";

export type Orientation = "vertical" | "horizontal";

// 縮尺と寸法。位置の計算に使うので、DESIGN.md のトークンではなくここで持つ
export const PX_PER_YEAR = 2;
export const TICK_STEP = 100;
// 棒の文字 1 行の高さ（DESIGN.md の caption の lineHeight 1.33 × 12px ≒ 16px）
export const LINE_HEIGHT = 16;
// 横向きの棒の太さ（名前と期間の 2 行が入る）と、縦向きの棒の最小の余白
export const BAR_THICKNESS = 36;
export const TRACK_GAP = 4;
export const LABEL_GAP = 6;
// 棒の中に文字を入れるときの余白の合計（両端の 1px の隙間と左右 5px ずつ）
const INSIDE_PADDING = 12;

export type TimeRange = { from: number; to: number };

// 王朝と在位のすべての年を含み、目盛りの区切りにそろえた範囲。データが無ければ null
export function timeRange(data: TimelineData): TimeRange | null {
  const years = [...data.dynasties, ...data.reigns].flatMap((item) => [
    item.start.year,
    item.end.year,
  ]);
  if (years.length === 0) return null;
  const from = Math.floor(Math.min(...years) / TICK_STEP) * TICK_STEP;
  const to = Math.ceil(Math.max(...years) / TICK_STEP) * TICK_STEP;
  return { from, to: to === from ? from + TICK_STEP : to };
}

export function ticks(range: TimeRange): number[] {
  const result: number[] = [];
  for (let year = range.from; year <= range.to; year += TICK_STEP) result.push(year);
  return result;
}

export function yearToOffset(year: number, range: TimeRange): number {
  return (year - range.from) * PX_PER_YEAR;
}

export function rangeLength(range: TimeRange): number {
  return yearToOffset(range.to, range);
}

// 期間が重なる棒を段に分ける。終わりと次の始まりが同じ年なら重ならないものとして同じ段に置く
export function assignTracks(periods: { start: number; end: number }[]): number[] {
  const order = periods
    .map((period, index) => ({ ...period, index }))
    .sort((a, b) => a.start - b.start || a.index - b.index);
  const trackEnds: number[] = [];
  const tracks = new Array<number>(periods.length).fill(0);
  for (const { start, end, index } of order) {
    let track = trackEnds.findIndex((trackEnd) => trackEnd <= start);
    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push(end);
    } else {
      trackEnds[track] = end;
    }
    tracks[index] = track;
  }
  return tracks;
}

export type LabelSize = { nameWidth: number; periodWidth: number };

export type BarLayout = {
  span: Span;
  period: string;
  offset: number; // 時間軸方向の開始位置（px）
  length: number; // 時間軸方向の長さ（px）
  track: number;
  // 棒の外に出すラベルの段。棒の中に収まるなら null
  labelRow: number | null;
};

export type LaneLayout = {
  bars: BarLayout[];
  trackCount: number;
  // 棒の外に出すラベルの段ごとの太さ（cross 方向の px）
  labelRowSizes: number[];
  // ラベルを含めた時間軸方向の末端（px）
  extent: number;
};

function fitsInside(orientation: Orientation, length: number, size: LabelSize): boolean {
  if (orientation === "horizontal") {
    return length >= Math.max(size.nameWidth, size.periodWidth) + INSIDE_PADDING;
  }
  // 縦向きは「名前 期間」を 1 行で入れる（両端の 1px の隙間を除いて 1 行の高さが要る）。
  // 幅が足りない分は省略記号で切る
  return length >= LINE_HEIGHT + 2;
}

// 棒の外に出すラベルの大きさ。横向きは名前と期間を 2 行に積み、棒の下に置く。縦向きは棒の右に置く
function outsideLabelSize(orientation: Orientation, size: LabelSize) {
  const width = Math.max(size.nameWidth, size.periodWidth) + LABEL_GAP;
  const height = LINE_HEIGHT * 2 + LABEL_GAP;
  return orientation === "horizontal"
    ? { along: width, cross: height }
    : { along: height, cross: width };
}

export function layoutLane(
  spans: Span[],
  range: TimeRange,
  orientation: Orientation,
  measure: (text: string) => number,
): LaneLayout {
  const periods = spans.map((span) => ({
    start: yearToOffset(span.start.year, range),
    end: yearToOffset(span.end.year, range),
  }));
  const tracks = assignTracks(periods);

  const bars: BarLayout[] = spans.map((span, i) => {
    const { start, end } = periods[i] ?? { start: 0, end: 0 };
    return {
      span,
      period: formatPeriod(span.start, span.end),
      offset: start,
      length: end - start,
      track: tracks[i] ?? 0,
      labelRow: null,
    };
  });

  const rowEnds: number[] = [];
  const labelRowSizes: number[] = [];
  let extent = rangeLength(range);
  const byOffset = [...bars].sort((a, b) => a.offset - b.offset);
  for (const bar of byOffset) {
    const size = { nameWidth: measure(bar.span.name), periodWidth: measure(bar.period) };
    if (fitsInside(orientation, bar.length, size)) continue;
    const { along, cross } = outsideLabelSize(orientation, size);
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= bar.offset);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(0);
      labelRowSizes.push(0);
    }
    rowEnds[row] = bar.offset + along;
    labelRowSizes[row] = Math.max(labelRowSizes[row] ?? 0, cross);
    bar.labelRow = row;
    extent = Math.max(extent, bar.offset + along);
  }

  return {
    bars,
    trackCount: bars.length === 0 ? 0 : Math.max(...tracks) + 1,
    labelRowSizes,
    extent,
  };
}

// ラベルの段 row が始まる位置（棒の段の後ろからの cross 方向の px）
export function labelRowStart(labelRowSizes: number[], row: number): number {
  return labelRowSizes.slice(0, row).reduce((sum, size) => sum + size + TRACK_GAP, 0);
}

// ラベルの段すべてを合わせた太さ
export function labelRowsTotal(labelRowSizes: number[]): number {
  return labelRowStart(labelRowSizes, labelRowSizes.length);
}
