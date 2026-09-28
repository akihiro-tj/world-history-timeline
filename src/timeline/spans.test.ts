import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { rowsForView, spansForLane, valueToView, viewToValue } from "./spans";

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

const names = { dynasty: "王朝", reign: "王" };

describe("rowsForView", () => {
  it("主題の表示では、行（国・地域）ごとにその主題の棒を並べる", () => {
    const rows = rowsForView(data, { kind: "subject", subject: "dynasty" }, names);
    expect(rows.map((row) => [row.id, row.name, row.spans.map((span) => span.name)])).toEqual([
      ["england", "イングランド", ["ヨーク家", "テューダー朝"]],
      ["empty", "空の行", []],
    ]);
  });

  it("主題が王なら、行ごとに在位を並べる", () => {
    const rows = rowsForView(data, { kind: "subject", subject: "reign" }, names);
    expect(rows.map((row) => row.spans.map((span) => span.name))).toEqual([["ヘンリ7世"], []]);
  });

  it("国・地域の表示では、その行の王朝と王を 2 行で並べる", () => {
    const rows = rowsForView(data, { kind: "lane", laneId: "england" }, names);
    expect(rows.map((row) => [row.id, row.name, row.spans.map((span) => span.name)])).toEqual([
      ["dynasty", "王朝", ["ヨーク家", "テューダー朝"]],
      ["reign", "王", ["ヘンリ7世"]],
    ]);
  });

  it("王朝も在位もない行を選んでも、空の 2 行を返す", () => {
    const rows = rowsForView(data, { kind: "lane", laneId: "empty" }, names);
    expect(rows).toEqual([
      { id: "dynasty", name: "王朝", spans: [] },
      { id: "reign", name: "王", spans: [] },
    ]);
  });

  it("存在しない行を選ぶと例外にする", () => {
    expect(() => rowsForView(data, { kind: "lane", laneId: "nowhere" }, names)).toThrow("nowhere");
  });
});

describe("viewToValue と valueToView", () => {
  const laneIds = ["england", "empty"];

  it("表示の状態とセレクトの値を相互に変換する", () => {
    const views = [
      { kind: "subject", subject: "dynasty" },
      { kind: "subject", subject: "reign" },
      { kind: "lane", laneId: "england" },
    ] as const;
    expect(views.map(viewToValue)).toEqual(["subject:dynasty", "subject:reign", "lane:england"]);
    for (const view of views) {
      expect(valueToView(viewToValue(view), laneIds)).toEqual(view);
    }
  });

  it("知らない値は null にする", () => {
    for (const value of [
      "",
      "subject",
      "subject:",
      "subject:war",
      "lane:nowhere",
      "lane:england:extra",
      "country:england",
    ]) {
      expect(valueToView(value, laneIds)).toBeNull();
    }
  });
});
