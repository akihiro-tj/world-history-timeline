// 年表の位置の計算。向き（縦／横）に依存しない形で、時間軸方向（along）と
// それに直交する方向（cross）の値を返す。描画側がこれを縦か横に当てはめる
import type { TimelineData, Year } from "../data/timeline";
import { bounds } from "../data/year";
import { formatPeriod, formatPeriodLines } from "./format";
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

// 期間の外形（いちばん早い始まりからいちばん遅い終わりまで）と、確かな区間（濃く描く区間）。
// 現在まで続く期間（end が null）は currentYear で終わる。確かな区間がない（開始の幅と終了の幅が
// 重なる）ときは、外形の中ほどの 1 点にする
export function extent(
  item: { start: Year; end: Year | null },
  currentYear: number,
): { from: number; to: number; solidFrom: number; solidTo: number } {
  const start = bounds(item.start);
  const end = item.end ? bounds(item.end) : { from: currentYear, to: currentYear };
  // 現在まで続くときは、開始の幅が現在の年を越えていても、確かな区間の始まりを現在の年までにとどめる
  const solidStart = item.end ? start.to : Math.min(start.to, currentYear);
  if (solidStart <= end.from) {
    return { from: start.from, to: end.to, solidFrom: solidStart, solidTo: end.from };
  }
  const middle = (start.from + end.to) / 2;
  return { from: start.from, to: end.to, solidFrom: middle, solidTo: middle };
}

// 王朝と在位のすべての年を含み、目盛りの区切りにそろえた範囲。データが無ければ null
export function timeRange(data: TimelineData, currentYear: number): TimeRange | null {
  const years = [...data.dynasties, ...data.reigns].flatMap((item) => {
    const e = extent(item, currentYear);
    return [e.from, e.to];
  });
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
  // 棒のラベルの期間。再登板をまとめた最初の棒では、すべての期間を 2 つずつ改行して並べる
  periodLines: string[];
  offset: number; // 時間軸方向の開始位置（px）
  length: number; // 時間軸方向の長さ（px）
  // 棒の始まり・終わりからぼかす長さ（px）。年の端なら 0（spec §4）
  fadeStart: number;
  fadeEnd: number;
  track: number;
  cross: number; // 段の開始位置（cross 方向の px）
  // 棒の中の文字の並べ方。棒の外に出すなら null
  inside: "row" | "stack" | null;
  // 棒の外に出すラベルの cross 方向の開始位置（px）。棒の中に収まるか、ラベルを出さないなら null
  labelCross: number | null;
};

// 再登板のまとめ方。最初の在位（primary）にすべての期間のラベルを付け、2 回目以降（secondary）は
// 棒の中に収まるときだけ自分の期間を出し、棒の外にはラベルを出さない
type LabelRole = "solo" | "primary" | "secondary";

function labelRoles(spans: Span[]): LabelRole[] {
  const firstOfGroup = new Map<string, number>();
  const counts = new Map<string, number>();
  spans.forEach((span, i) => {
    if (span.group === null) return;
    counts.set(span.group, (counts.get(span.group) ?? 0) + 1);
    const first = firstOfGroup.get(span.group);
    if (
      first === undefined ||
      bounds(span.start).from <
        (spans[first] ? bounds(spans[first].start).from : Number.POSITIVE_INFINITY)
    ) {
      firstOfGroup.set(span.group, i);
    }
  });
  return spans.map((span, i) => {
    if (span.group === null || (counts.get(span.group) ?? 0) < 2) return "solo";
    return firstOfGroup.get(span.group) === i ? "primary" : "secondary";
  });
}

export type LaneLayout = {
  bars: BarLayout[];
  // 棒とラベルを含めた cross 方向の太さ（px）
  crossExtent: number;
  // ラベルを含めた時間軸方向の末端（px）
  extent: number;
};

// 縦向きの 1 段（棒 1 本）の幅。棒の中の「名前 期間」が読める幅にする
export const VERTICAL_TRACK_WIDTH = 112;

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

// 縦向きで 1 行に並べる名前と期間の間隔（DESIGN.md の spacing xs）
const INLINE_GAP = 4;

// 棒の中の文字の並べ方。名前と期間を 1 行に並べる（row）か 2 行に積む（stack）。
// 名前と期間のどちらかが切れるなら入れない（null）
function insideText(
  orientation: Orientation,
  length: number,
  size: LabelSize,
): "row" | "stack" | null {
  const widest = Math.max(size.nameWidth, size.periodWidth) + INSIDE_PADDING;
  if (orientation === "horizontal") return length >= widest ? "stack" : null;
  // 縦向きは棒の幅に収まれば入れる。高さは 1 行なら 1 行分、2 行なら 2 行分（両端の 1px の隙間を足す）が要る
  const inline = size.nameWidth + INLINE_GAP + size.periodWidth + INSIDE_PADDING;
  if (length >= LINE_HEIGHT + 2 && inline <= VERTICAL_TRACK_WIDTH) return "row";
  if (length >= LINE_HEIGHT * 2 + 2 && widest <= VERTICAL_TRACK_WIDTH) return "stack";
  return null;
}

// 棒の外に出すラベルの大きさ。横向きは名前と期間（1 行以上）を積み、棒の下に置く。縦向きは棒の右に置く
function outsideLabelSize(orientation: Orientation, size: LabelSize, periodLineCount: number) {
  const width = Math.max(size.nameWidth, size.periodWidth) + LABEL_GAP;
  const height = LINE_HEIGHT * (1 + periodLineCount) + LABEL_GAP;
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
    const e = extent(span, currentYear);
    const end = Math.max(e.to, e.from + 1);
    return {
      start: yearToOffset(e.from, range),
      end: yearToOffset(end, range),
      fadeStart: (e.solidFrom - e.from) * PX_PER_YEAR,
      fadeEnd: (e.to - e.solidTo) * PX_PER_YEAR,
    };
  });
  const tracks = assignTracks(periods);

  const size = trackSize(orientation);
  const roles = labelRoles(spans);
  const bars: BarLayout[] = spans.map((span, i) => {
    const { start, end, fadeStart, fadeEnd } = periods[i] ?? {
      start: 0,
      end: 0,
      fadeStart: 0,
      fadeEnd: 0,
    };
    const track = tracks[i] ?? 0;
    const group = spans.filter((other) => other.group !== null && other.group === span.group);
    return {
      span,
      periodLines:
        roles[i] === "primary"
          ? formatPeriodLines(
              [...group].sort((a, b) => bounds(a.start).from - bounds(b.start).from),
            )
          : [formatPeriod(span.start, span.end)],
      offset: start,
      length: end - start,
      fadeStart,
      fadeEnd,
      track,
      cross: track * (size + TRACK_GAP),
      inside: null,
      labelCross: null,
    };
  });

  const obstacles: Rect[] = bars.map((bar) => ({
    along: bar.offset,
    alongEnd: bar.offset + bar.length,
    cross: bar.cross,
    crossEnd: bar.cross + size,
  }));
  let alongExtent = rangeLength(range);
  let crossExtent = obstacles.reduce((max, rect) => Math.max(max, rect.crossEnd), 0);
  const byOffset = [...bars]
    .map((bar, i) => ({ bar, role: roles[i] ?? "solo" }))
    .sort((a, b) => a.bar.offset - b.bar.offset || a.bar.track - b.bar.track);
  for (const { bar, role } of byOffset) {
    const text = {
      nameWidth: measure(bar.span.name),
      periodWidth: Math.max(...bar.periodLines.map(measure)),
    };
    // 期間が 2 行以上のラベルは棒の中に入れない
    bar.inside =
      bar.periodLines.length === 1
        ? insideText(orientation, bar.length - bar.fadeStart - bar.fadeEnd, text)
        : null;
    if (bar.inside || role === "secondary") continue;
    const label = outsideLabelSize(orientation, text, bar.periodLines.length);
    const alongRange = { start: bar.offset, end: bar.offset + label.along };
    const cross = placeLabel(bar.cross + size + TRACK_GAP, alongRange, label.cross, obstacles);
    obstacles.push({
      along: alongRange.start,
      alongEnd: alongRange.end,
      cross,
      crossEnd: cross + label.cross,
    });
    bar.labelCross = cross;
    alongExtent = Math.max(alongExtent, alongRange.end);
    crossExtent = Math.max(crossExtent, cross + label.cross);
  }

  return { bars, crossExtent, extent: alongExtent };
}
