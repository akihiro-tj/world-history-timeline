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

describe("formatYear（世紀・千年紀）", () => {
  it.each([
    [{ century: -27, part: null, circa: true }, "前27世紀頃"],
    [{ century: -19, part: "early", circa: false }, "前19世紀初め"],
    [{ century: -17, part: "middle", circa: true }, "前17世紀半ば頃"],
    [{ century: -8, part: "late", circa: false }, "前8世紀末"],
    [{ century: 4, part: null, circa: false }, "4世紀"],
    [{ millennium: -2, part: "second-half", circa: false }, "前2千年紀後半"],
    [{ millennium: -3, part: "first-half", circa: false }, "前3千年紀前半"],
  ] as const)("%o は %s", (value, text) => {
    expect(formatYear(value)).toBe(text);
  });
});

describe("formatPeriod（世紀・千年紀）", () => {
  it("年と世紀をつなぐ", () => {
    expect(
      formatPeriod({ year: -2040, circa: true }, { century: -18, part: null, circa: true }),
    ).toBe("前2040頃–前18世紀頃");
  });

  it("開始と終了が同じ世紀なら 1 つだけ出す", () => {
    const c = { century: -26, part: null, circa: true };
    expect(formatPeriod(c, { ...c })).toBe("前26世紀頃");
  });

  it("同じ世紀でも部分が違えば両方出す", () => {
    expect(
      formatPeriod(
        { century: -6, part: "early", circa: false },
        { century: -6, part: "late", circa: false },
      ),
    ).toBe("前6世紀初め–前6世紀末");
  });
});
