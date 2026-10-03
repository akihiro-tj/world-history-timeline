import { describe, expect, it } from "vitest";
import type { Row, Span, View } from "../timeline/spans";
import { isSelected, keepSelection, laneIdOf, spanKey } from "./selection";

const y = (year: number) => ({ year, circa: false });
const dynasty: Span = {
  id: "tudor",
  name: "テューダー朝",
  start: y(1485),
  end: y(1603),
  group: null,
};
const reign: Span = {
  id: "pitt-1783",
  name: "ピット",
  start: y(1783),
  end: y(1801),
  group: "pitt/ピット",
};
const rows: Row[] = [{ id: "england", name: "イングランド", spans: [dynasty, reign] }];
const subject: View = { kind: "subject", subject: "regime" };
const lane: View = { kind: "lane", laneId: "england" };

describe("選択", () => {
  it("棒から選択の key を作る", () => {
    expect(spanKey(dynasty)).toBe("dynasty:tudor");
    expect(spanKey(reign)).toBe("reign:pitt/ピット");
  });

  it("主題の表示では行が国・地域、国・地域の表示では選んだ国・地域", () => {
    expect(laneIdOf(subject, { id: "france", name: "", spans: [] })).toBe("france");
    expect(laneIdOf(lane, { id: "monarch", name: "", spans: [] })).toBe("england");
  });

  it("同じ行の同じまとまりの棒を選んだものとする", () => {
    const selection = { laneId: "england", key: "reign:pitt/ピット" };
    expect(isSelected(selection, "england", reign)).toBe(true);
    expect(isSelected(selection, "england", { ...reign, id: "pitt-1804" })).toBe(true);
    expect(isSelected(selection, "france", reign)).toBe(false);
    expect(isSelected(selection, "england", dynasty)).toBe(false);
    expect(isSelected(null, "england", dynasty)).toBe(false);
  });

  it("表示を切り替えた先に選んだ項目があれば残し、なければ外す", () => {
    const selection = { laneId: "england", key: "dynasty:tudor" };
    expect(keepSelection(selection, subject, rows)).toEqual(selection);
    expect(keepSelection(selection, lane, [{ id: "regime", name: "", spans: [dynasty] }])).toEqual(
      selection,
    );
    expect(
      keepSelection(selection, subject, [{ id: "england", name: "", spans: [reign] }]),
    ).toBeNull();
    expect(keepSelection(null, subject, rows)).toBeNull();
  });
});
