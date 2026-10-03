import { describe, expect, it } from "vitest";
import { revealDelta, unionBox } from "./reveal";

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
