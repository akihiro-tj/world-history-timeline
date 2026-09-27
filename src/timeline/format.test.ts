import { describe, expect, it } from "vitest";
import { formatPeriod, formatYear } from "./format";

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
});
