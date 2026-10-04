import { describe, expect, it } from "vitest";
import type { BarLayout } from "./layout";
import { nearbyBars, visibleRange } from "./nearby";

// テストに要る項目だけを持つ棒
const bar = (id: string, offset: number, length: number, track = 0, reach = offset + length) =>
  ({ span: { id }, offset, length, track, reach }) as unknown as BarLayout;
const ids = (result: ReturnType<typeof nearbyBars>) =>
  result && { before: result.before?.span.id ?? null, after: result.after?.span.id ?? null };

describe("visibleRange", () => {
  it("横向きは表示領域の幅がそのまま見えている範囲", () => {
    expect(visibleRange(300, 375, 1, 0)).toEqual({ start: 300, end: 675 });
  });

  it("縦向きは見出しの分と、シートに隠れた分を除く", () => {
    // 高さ 600px のうち見えているのは上 44%（264px）。見出し 32px を除いて 232px
    expect(visibleRange(1000, 600, 0.44, 32)).toEqual({ start: 1000, end: 1232 });
  });
});

describe("nearbyBars", () => {
  const bars = [bar("a", 0, 100), bar("b", 500, 100), bar("c", 900, 50)];

  it("見えている範囲にかかる棒があれば null", () => {
    expect(nearbyBars(bars, { start: 550, end: 700 })).toBeNull();
  });

  it("空なら前後のいちばん近い棒を返す", () => {
    expect(ids(nearbyBars(bars, { start: 650, end: 850 }))).toEqual({ before: "b", after: "c" });
  });

  it("片側にしか棒がなければ、もう片側は null", () => {
    expect(ids(nearbyBars(bars, { start: 1000, end: 1200 }))).toEqual({ before: "c", after: null });
    expect(ids(nearbyBars(bars, { start: -300, end: -100 }))).toEqual({ before: null, after: "a" });
  });

  it("範囲の端にちょうど接する棒は見えていない扱い", () => {
    expect(ids(nearbyBars(bars, { start: 600, end: 900 }))).toEqual({ before: "b", after: "c" });
  });

  it("棒の外のラベルだけが範囲にかかっていても null", () => {
    const labeled = [bar("a", 0, 20, 0, 120), bar("b", 500, 100)];
    expect(nearbyBars(labeled, { start: 100, end: 300 })).toBeNull();
  });

  it("前の棒は、ラベルを含めた終わりがいちばん遅い棒", () => {
    const labeled = [bar("long", 0, 300), bar("short", 250, 20, 1, 340)];
    expect(ids(nearbyBars(labeled, { start: 400, end: 600 }))?.before).toBe("short");
  });

  it("同じ位置なら段の小さい棒", () => {
    const tied = [bar("upper", 500, 100, 0), bar("lower", 500, 200, 1)];
    expect(ids(nearbyBars(tied, { start: 0, end: 300 }))?.after).toBe("upper");
  });

  it("棒が 1 本もない行や、見えている範囲の長さがないときは null", () => {
    expect(nearbyBars([], { start: 0, end: 300 })).toBeNull();
    expect(nearbyBars(bars, { start: 650, end: 640 })).toBeNull();
  });
});
