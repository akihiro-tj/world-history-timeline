import { describe, expect, it } from "vitest";
import { centeredScroll, revealDelta, unionBox } from "./reveal";

describe("revealDelta", () => {
  it("見えていればスクロールしない", () => {
    expect(revealDelta(100, 150, 0, 400)).toBe(0);
  });

  it("見える範囲より後ろにあれば、終わりがそろうまで進める", () => {
    expect(revealDelta(500, 560, 0, 400)).toBe(160 + 8);
  });

  it("見える範囲より前にあれば、始まりがそろうまで戻す", () => {
    expect(revealDelta(-100, -40, 0, 400)).toBe(-100 - 8);
  });

  it("見える範囲より大きければ始まりにそろえる", () => {
    expect(revealDelta(300, 900, 0, 400)).toBe(300 - 8);
  });
});

describe("centeredScroll", () => {
  // 見える範囲は画面上の 100〜300（真ん中は 200）。今のスクロール位置は 1000、最大は 5000
  it("項目の真ん中が見える範囲の真ん中に来るスクロール位置を返す", () => {
    expect(centeredScroll(400, 440, 100, 300, 1000, 5000)).toBe(1000 + 220);
    expect(centeredScroll(0, 40, 100, 300, 1000, 5000)).toBe(1000 - 180);
  });

  it("見えている項目も真ん中に合わせる", () => {
    expect(centeredScroll(150, 170, 100, 300, 1000, 5000)).toBe(1000 - 40);
  });

  it("見える範囲より大きければ、始まりを範囲の始まりにそろえる", () => {
    expect(centeredScroll(400, 700, 100, 300, 1000, 5000)).toBe(1000 + 300 - 8);
  });

  it("スクロールできる範囲を超えない", () => {
    expect(centeredScroll(0, 40, 100, 300, 50, 5000)).toBe(0);
    expect(centeredScroll(900, 940, 100, 300, 4900, 5000)).toBe(5000);
  });
});

describe("unionBox", () => {
  it("選んだ棒とラベルをまとめた範囲を返す", () => {
    const bar = { top: 100, bottom: 136, left: 900, right: 915 };
    const label = { top: 140, bottom: 172, left: 901, right: 990 };
    expect(unionBox([bar, label])).toEqual({ top: 100, bottom: 172, left: 900, right: 990 });
  });

  it("要素がなければ null", () => {
    expect(unionBox([])).toBeNull();
  });
});
