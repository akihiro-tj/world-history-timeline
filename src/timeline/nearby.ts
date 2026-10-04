// 見えている範囲が空の行に出す「次の駅」の案内（spec §4）
import type { BarLayout } from "./layout";

export type Nearby = { before: BarLayout | null; after: BarLayout | null };

// 時間軸方向の見えている範囲（px）。scrollStart はスクロール量、viewport は表示領域の長さ、
// visibleRatio は表示領域のうち見えている割合（スマホのシートの上）、header は先頭に貼り付いた見出しの長さ
export function visibleRange(
  scrollStart: number,
  viewport: number,
  visibleRatio: number,
  header: number,
): { start: number; end: number } {
  return { start: scrollStart, end: scrollStart + viewport * visibleRatio - header };
}

// 見えている範囲に棒（棒の外のラベルを含む）が 1 つもかかっていなければ、前後のいちばん近い棒を返す。
// かかっている棒があるとき、棒が 1 本もないとき、範囲の長さがないときは null
export function nearbyBars(
  bars: BarLayout[],
  range: { start: number; end: number },
): Nearby | null {
  if (bars.length === 0 || range.end <= range.start) return null;
  if (bars.some((bar) => bar.offset < range.end && bar.reach > range.start)) return null;
  let before: BarLayout | null = null;
  let after: BarLayout | null = null;
  for (const bar of bars) {
    if (
      bar.reach <= range.start &&
      (!before ||
        bar.reach > before.reach ||
        (bar.reach === before.reach && bar.track < before.track))
    ) {
      before = bar;
    }
    if (
      bar.offset >= range.end &&
      (!after ||
        bar.offset < after.offset ||
        (bar.offset === after.offset && bar.track < after.track))
    ) {
      after = bar;
    }
  }
  return { before, after };
}
