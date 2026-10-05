// 向きの切り替えの前後で画面中央の年を保つための計算
import { PX_PER_YEAR, type TimeRange } from "./layout";

// scrollStart: 時間軸方向のスクロール量。viewport: 時間軸方向の表示領域の長さ。
// axisOffset: 時間軸方向の先頭に貼り付いている見出しの長さ（縦向きの行の見出し）
export function centerYear(
  scrollStart: number,
  viewport: number,
  axisOffset: number,
  range: TimeRange,
): number {
  return range.from + (scrollStart + (viewport - axisOffset) / 2) / PX_PER_YEAR;
}

// year が画面中央に来るスクロール量。スクロールできる範囲 [0, maxScroll] に収める
export function scrollStartFor(
  year: number,
  viewport: number,
  axisOffset: number,
  range: TimeRange,
  maxScroll: number,
): number {
  const start = (year - range.from) * PX_PER_YEAR - (viewport - axisOffset) / 2;
  return Math.min(Math.max(start, 0), Math.max(maxScroll, 0));
}

// position（時間軸方向の px）が見えている範囲（長さ visibleLength）の中ほどに来るスクロール量。
// スクロールできる範囲 [0, maxScroll] に収める
export function centerScroll(position: number, visibleLength: number, maxScroll: number): number {
  return Math.min(Math.max(position - visibleLength / 2, 0), Math.max(maxScroll, 0));
}
