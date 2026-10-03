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

export type Box = { top: number; bottom: number; left: number; right: number };

// 選んだ棒と棒の外のラベルをまとめた範囲（ラベルまで見えるようにスクロールするため）
export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  return {
    top: Math.min(...boxes.map((box) => box.top)),
    bottom: Math.max(...boxes.map((box) => box.bottom)),
    left: Math.min(...boxes.map((box) => box.left)),
    right: Math.max(...boxes.map((box) => box.right)),
  };
}

// 選んだ項目（itemStart〜itemEnd）を見える範囲（areaStart〜areaEnd）の真ん中に置くスクロール位置。
// 位置はどれも画面上の座標で、current は今のスクロール位置、max はスクロールできる最大の位置。
// 見える範囲より大きい項目は、始まりを範囲の始まりにそろえる
export function centeredScroll(
  itemStart: number,
  itemEnd: number,
  areaStart: number,
  areaEnd: number,
  current: number,
  max: number,
): number {
  const delta =
    itemEnd - itemStart > areaEnd - areaStart
      ? itemStart - areaStart - REVEAL_MARGIN
      : (itemStart + itemEnd) / 2 - (areaStart + areaEnd) / 2;
  return Math.min(Math.max(current + delta, 0), max);
}
