import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { spansForLane } from "./spans";

const y = (year: number) => ({ year, circa: false });

const data: TimelineData = {
  lanes: [
    { id: "england", name: "イングランド", dynasties: ["york", "tudor"], reigns: ["henry-vii"] },
    { id: "empty", name: "空の行", dynasties: [], reigns: [] },
  ],
  dynasties: [
    { id: "tudor", name: "テューダー朝", start: y(1485), end: y(1603) },
    { id: "york", name: "ヨーク家", start: y(1461), end: y(1485) },
  ],
  people: [{ id: "henry", name: "ヘンリ7世" }],
  reigns: [{ id: "henry-vii", personId: "henry", start: y(1485), end: y(1509) }],
};

describe("spansForLane", () => {
  it("王朝は行に並べた順で返す", () => {
    const lane = data.lanes[0];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "dynasty").map((span) => span.name)).toEqual([
      "ヨーク家",
      "テューダー朝",
    ]);
  });

  it("在位は人物の名前と在位の期間を返す", () => {
    const lane = data.lanes[0];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "reign")).toEqual([
      { id: "henry-vii", name: "ヘンリ7世", start: y(1485), end: y(1509) },
    ]);
  });

  it("その主題の項目が無い行は空の配列を返す", () => {
    const lane = data.lanes[1];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "reign")).toEqual([]);
  });
});
