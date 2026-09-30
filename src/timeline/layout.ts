// 年表の位置の計算。向き（縦／横）に依存しない形で、時間軸方向（along）と
// それに直交する方向（cross）の値を返す。描画側がこれを縦か横に当てはめる
import type { TimelineData, Year } from "../data/timeline";
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
// 棒の中に文字を入れるときの余白の合計（両端の 1px の隙間と左右 4px ずつに、少し余裕を足す）
const INSIDE_PADDING = 12;

export type TimeRange = { from: number; to: number };

// 終わりの年。現在まで続く期間（end が null）は currentYear で終わる
export function endYear(item: { end: Year | null }, currentYear: number): number {
  return item.end?.year ?? currentYear;
}

// 王朝と在位のすべての年を含み、目盛りの区切りにそろえた範囲。データが無ければ null
export function timeRange(data: TimelineData, currentYear: number): TimeRange | null {
  const years = [...data.dynasties, ...data.reigns].flatMap((item) => [
    item.start.year,
    endYear(item, currentYear),
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
  cross: number; // 段の開始位置（cross 方向の px）
  // 棒の外に出すラベルの cross 方向の開始位置（px）。棒の中に収まるなら null
  labelCross: number | null;
};

export type LaneLayout = {
  bars: BarLayout[];
  // 棒とラベルを含めた cross 方向の太さ（px）
  crossExtent: number;
  // ラベルを含めた時間軸方向の末端（px）
  extent: number;
};

// 縦向きの 1 段（棒 1 本）の幅。棒の中の「名前 期間」が読める幅にする
export const VERTICAL_TRACK_WIDTH = 104;

export function trackSize(orientation: Orientation): number {
  return orientation === "horizontal" ? BAR_THICKNESS : VERTICAL_TRACK_WIDTH;
}

type Rect = { along: number; alongEnd: number; cross: number; crossEnd: number };

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.along < b.alongEnd && b.along < a.alongEnd && a.cross < b.crossEnd && b.cross < a.crossEnd
  );
}

// 棒の外のラベルを、自分の棒のすぐ外側から、ほかの棒やラベルに重ならない最初の位置に置く
function placeLabel(
  from: number,
  along: { start: number; end: number },
  size: number,
  obstacles: Rect[],
): number {
  const candidates = [from, ...obstacles.map((rect) => rect.crossEnd + TRACK_GAP)]
    .filter((cross) => cross >= from)
    .sort((a, b) => a - b);
  for (const cross of candidates) {
    const rect = { along: along.start, alongEnd: along.end, cross, crossEnd: cross + size };
    if (!obstacles.some((obstacle) => overlaps(rect, obstacle))) return cross;
  }
  // 候補の最後（すべての障害物の外側）はかならず空いている
  return candidates[candidates.length - 1] ?? from;
}

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
  currentYear: number,
): LaneLayout {
  // 開始と終了が同じ年の棒は、長さが 0 にならないよう、その 1 年分の長さを持たせる
  const periods = spans.map((span) => {
    const start = span.start.year;
    const end = Math.max(endYear(span, currentYear), start + 1);
    return { start: yearToOffset(start, range), end: yearToOffset(end, range) };
  });
  const tracks = assignTracks(periods);

  const size = trackSize(orientation);
  const bars: BarLayout[] = spans.map((span, i) => {
    const { start, end } = periods[i] ?? { start: 0, end: 0 };
    const track = tracks[i] ?? 0;
    return {
      span,
      period: formatPeriod(span.start, span.end),
      offset: start,
      length: end - start,
      track,
      cross: track * (size + TRACK_GAP),
      labelCross: null,
    };
  });

  const obstacles: Rect[] = bars.map((bar) => ({
    along: bar.offset,
    alongEnd: bar.offset + bar.length,
    cross: bar.cross,
    crossEnd: bar.cross + size,
  }));
  let extent = rangeLength(range);
  let crossExtent = obstacles.reduce((max, rect) => Math.max(max, rect.crossEnd), 0);
  const byOffset = [...bars].sort((a, b) => a.offset - b.offset || a.track - b.track);
  for (const bar of byOffset) {
    const text = { nameWidth: measure(bar.span.name), periodWidth: measure(bar.period) };
    if (fitsInside(orientation, bar.length, text)) continue;
    const label = outsideLabelSize(orientation, text);
    const alongRange = { start: bar.offset, end: bar.offset + label.along };
    const cross = placeLabel(bar.cross + size + TRACK_GAP, alongRange, label.cross, obstacles);
    obstacles.push({
      along: alongRange.start,
      alongEnd: alongRange.end,
      cross,
      crossEnd: cross + label.cross,
    });
    bar.labelCross = cross;
    extent = Math.max(extent, alongRange.end);
    crossExtent = Math.max(crossExtent, cross + label.cross);
  }

  return { bars, crossExtent, extent };
}
