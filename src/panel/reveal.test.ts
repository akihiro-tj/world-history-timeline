import { describe, expect, it } from "vitest";
import { revealDelta } from "./reveal";

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
