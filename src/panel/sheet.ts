// スマホの出典シートの位置（spec §5）。シートは高さいっぱいで作り、下へずらして見える高さを変える
export type SheetState = "full" | "half" | "closed";

// 半分の高さのときに見えている割合
export const SHEET_HEIGHT_RATIO = 0.56;
// これより速く（px/ms）離したら、弾いた向きの次の位置へ進む
const FLING_VELOCITY = 0.5;

const STATES: SheetState[] = ["full", "half", "closed"];

export function sheetOffset(state: SheetState, height: number): number {
  if (state === "full") return 0;
  if (state === "half") return height * (1 - SHEET_HEIGHT_RATIO);
  return height;
}

// 指を離したときのずらし量（offset）と速さ（下向きが正）から、収まる位置を決める
export function settleSheet(offset: number, velocity: number, height: number): SheetState {
  if (velocity <= -FLING_VELOCITY) {
    return [...STATES].reverse().find((state) => sheetOffset(state, height) < offset) ?? "full";
  }
  if (velocity >= FLING_VELOCITY) {
    return STATES.find((state) => sheetOffset(state, height) > offset) ?? "closed";
  }
  return STATES.reduce((nearest, state) =>
    Math.abs(sheetOffset(state, height) - offset) < Math.abs(sheetOffset(nearest, height) - offset)
      ? state
      : nearest,
  );
}

// 指を離したときの速さ（px/ms、下向きが正）。離す直前 100ms の動きだけで測り、止めてから離したら 0
const VELOCITY_WINDOW_MS = 100;

export function releaseVelocity(samples: { y: number; t: number }[], now: number): number {
  const recent = samples.filter((sample) => sample.t >= now - VELOCITY_WINDOW_MS);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last || last.t <= first.t) return 0;
  return (last.y - first.y) / (last.t - first.t);
}
