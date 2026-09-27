import { describe, expect, it } from "vitest";
import { centerYear, initialOrientation, scrollStartFor } from "./scroll";

const range = { from: 400, to: 1700 };

describe("initialOrientation", () => {
  it("横長なら横、縦長や正方形なら縦", () => {
    expect(initialOrientation(1280, 800)).toBe("horizontal");
    expect(initialOrientation(375, 667)).toBe("vertical");
    expect(initialOrientation(600, 600)).toBe("vertical");
  });
});

describe("centerYear と scrollStartFor", () => {
  it("中央の年を求め、同じ年が中央に来るスクロール量に戻せる", () => {
    // 横向き（見出しなし）で 1200 年が中央: (1200-400)*2 - 400/2 = 1400
    expect(centerYear(1400, 400, 0, range)).toBe(1200);
    expect(scrollStartFor(1200, 400, 0, range, 5000)).toBe(1400);
  });

  it("縦向きは先頭の見出しの分を除いて中央を求める", () => {
    // 表示 600px のうち見出し 32px。中央は 1400 + 284 = 1684px → 1242 年
    expect(centerYear(1400, 600, 32, range)).toBe(1242);
    expect(scrollStartFor(1242, 600, 32, range, 5000)).toBe(1400);
  });

  it("縦から横に切り替えても同じ年が中央に来る", () => {
    const year = centerYear(900, 600, 32, range);
    const start = scrollStartFor(year, 1280, 0, range, 5000);
    expect(centerYear(start, 1280, 0, range)).toBeCloseTo(year);
  });

  it("先頭や末尾を越えるスクロール量は範囲に収める", () => {
    expect(scrollStartFor(400, 600, 32, range, 5000)).toBe(0);
    expect(scrollStartFor(1700, 600, 0, range, 2000)).toBe(2000);
  });

  it("スクロールできない（内容が画面より短い）なら 0", () => {
    expect(scrollStartFor(1200, 600, 0, range, -10)).toBe(0);
  });
});
