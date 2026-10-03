// 選んだ棒を見える範囲に入れるためのスクロール量（正なら進める、負なら戻す、0 なら動かさない）
// 端にぴったり付けず、少し余白を残す
export const REVEAL_MARGIN = 8;

export function revealDelta(
  itemStart: number,
  itemEnd: number,
  areaStart: number,
  areaEnd: number,
): number {
  if (itemStart >= areaStart && itemEnd <= areaEnd) return 0;
  if (itemEnd - itemStart > areaEnd - areaStart || itemStart < areaStart) {
    return itemStart - areaStart - REVEAL_MARGIN;
  }
  return itemEnd - areaEnd + REVEAL_MARGIN;
}
