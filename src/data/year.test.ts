import { describe, expect, it } from "vitest";
import { bounds, sameYear } from "./year";

describe("bounds", () => {
  it("年は幅のない 1 点", () => {
    expect(bounds({ year: -221, circa: true })).toEqual({ from: -221, to: -221 });
  });

  it("紀元前と紀元後の世紀", () => {
    expect(bounds({ century: -27, part: null, circa: true })).toEqual({ from: -2700, to: -2600 });
    expect(bounds({ century: 4, part: null, circa: false })).toEqual({ from: 300, to: 400 });
  });

  it("紀元前と紀元後の千年紀", () => {
    expect(bounds({ millennium: -2, part: null, circa: false })).toEqual({
      from: -2000,
      to: -1000,
    });
    expect(bounds({ millennium: 2, part: null, circa: false })).toEqual({ from: 1000, to: 2000 });
  });

  it("初め・半ば・末は 3 等分し、端数を四捨五入する", () => {
    const c = (part: "early" | "middle" | "late") => bounds({ century: -19, part, circa: false });
    expect(c("early")).toEqual({ from: -1900, to: -1867 });
    expect(c("middle")).toEqual({ from: -1867, to: -1833 });
    expect(c("late")).toEqual({ from: -1833, to: -1800 });
  });

  it("前半・後半は 2 等分する", () => {
    const m = (part: "first-half" | "second-half") =>
      bounds({ millennium: -2, part, circa: false });
    expect(m("first-half")).toEqual({ from: -2000, to: -1500 });
    expect(m("second-half")).toEqual({ from: -1500, to: -1000 });
  });
});

describe("sameYear", () => {
  it("形・数・部分・頃がすべて同じときだけ同じ", () => {
    const c = { century: -26, part: null, circa: true };
    expect(sameYear(c, { ...c })).toBe(true);
    expect(sameYear(c, { ...c, circa: false })).toBe(false);
    expect(sameYear(c, { ...c, part: "early" })).toBe(false);
    expect(sameYear(c, { millennium: -26, part: null, circa: true })).toBe(false);
    expect(sameYear({ year: 1871, circa: false }, { year: 1871, circa: false })).toBe(true);
  });
});
