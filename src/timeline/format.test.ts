import { describe, expect, it } from "vitest";
import { formatPeriod, formatPeriodLines, formatYear } from "./format";

describe("formatYear", () => {
  it("紀元後の年は数字だけ", () => {
    expect(formatYear({ year: 481, circa: false })).toBe("481");
  });

  it("circa なら「頃」を付ける", () => {
    expect(formatYear({ year: 465, circa: true })).toBe("465頃");
  });

  it("紀元前は「前」を付ける", () => {
    expect(formatYear({ year: -221, circa: false })).toBe("前221");
    expect(formatYear({ year: -221, circa: true })).toBe("前221頃");
  });
});

describe("formatPeriod", () => {
  it("開始と終了を en dash でつなぐ", () => {
    expect(formatPeriod({ year: 481, circa: false }, { year: 751, circa: false })).toBe("481–751");
  });

  it("開始と終了が同じ年なら 1 つだけ出す", () => {
    expect(formatPeriod({ year: 1871, circa: false }, { year: 1871, circa: false })).toBe("1871");
  });

  it("同じ年でも circa が違えば両方出す", () => {
    expect(formatPeriod({ year: 900, circa: true }, { year: 900, circa: false })).toBe("900頃–900");
  });

  it("終わりが null なら「現在」まで", () => {
    expect(formatPeriod({ year: 1958, circa: false }, null)).toBe("1958–現在");
  });
});

describe("formatPeriodLines", () => {
  const y = (year: number) => ({ year, circa: false });

  it("期間が 1 つなら 1 行", () => {
    expect(formatPeriodLines([{ start: y(1906), end: y(1909) }])).toEqual(["1906–1909"]);
  });

  it("2 つまでは「、」でつないで 1 行", () => {
    expect(
      formatPeriodLines([
        { start: y(1906), end: y(1909) },
        { start: y(1917), end: y(1920) },
      ]),
    ).toEqual(["1906–1909、1917–1920"]);
  });

  it("3 つ以上は 2 つずつ改行し、改行の前にも「、」を付ける", () => {
    expect(
      formatPeriodLines([
        { start: y(1909), end: y(1911) },
        { start: y(1913), end: y(1913) },
        { start: y(1915), end: y(1917) },
        { start: y(1929), end: null },
      ]),
    ).toEqual(["1909–1911、1913、", "1915–1917、1929–現在"]);
  });
});
