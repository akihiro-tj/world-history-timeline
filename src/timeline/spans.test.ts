import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { rowsForView, spansForLane, valueToView, viewToValue } from "./spans";

const y = (year: number) => ({ year, circa: false });

const data: TimelineData = {
  lanes: [
    {
      id: "england",
      name: "イングランド",
      dynasties: ["york", "tudor", "cabinet"],
      reigns: ["henry-vii", "walpole"],
    },
    { id: "empty", name: "空の行", dynasties: [], reigns: [] },
  ],
  dynasties: [
    { id: "tudor", name: "テューダー朝", kind: "regime", start: y(1485), end: y(1603) },
    { id: "york", name: "ヨーク家", kind: "regime", start: y(1461), end: y(1485) },
    { id: "cabinet", name: "内閣", kind: "government", start: y(1500), end: y(1510) },
  ],
  people: [
    { id: "henry", name: "ヘンリ7世" },
    { id: "walpole", name: "ウォルポール" },
  ],
  reigns: [
    { id: "henry-vii", personId: "henry", role: "monarch", start: y(1485), end: y(1509) },
    { id: "walpole", personId: "walpole", role: "leader", start: y(1721), end: y(1742) },
  ],
};

describe("spansForLane", () => {
  it("王朝は種類ごとに、行に並べた順で返す", () => {
    const lane = data.lanes[0];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "regime").map((span) => span.name)).toEqual([
      "ヨーク家",
      "テューダー朝",
    ]);
    expect(spansForLane(data, lane, "government").map((span) => span.name)).toEqual(["内閣"]);
  });

  it("在位は役割ごとに、人物の名前と在位の期間を返す", () => {
    const lane = data.lanes[0];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "monarch")).toEqual([
      { id: "henry-vii", name: "ヘンリ7世", start: y(1485), end: y(1509) },
    ]);
    expect(spansForLane(data, lane, "leader")).toEqual([
      { id: "walpole", name: "ウォルポール", start: y(1721), end: y(1742) },
    ]);
  });

  it("その主題の項目が無い行は空の配列を返す", () => {
    const lane = data.lanes[1];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "monarch")).toEqual([]);
  });
});

const names = {
  regime: "国家・体制",
  government: "政権",
  monarch: "君主",
  leader: "首相・大統領など",
};

describe("rowsForView", () => {
  it("主題の表示では、行（国・地域）ごとにその主題の棒を並べる", () => {
    const rows = rowsForView(data, { kind: "subject", subject: "regime" }, names);
    expect(rows.map((row) => [row.id, row.name, row.spans.map((span) => span.name)])).toEqual([
      ["england", "イングランド", ["ヨーク家", "テューダー朝"]],
      ["empty", "空の行", []],
    ]);
  });

  it("主題が君主なら、行ごとに君主の在位を並べる", () => {
    const rows = rowsForView(data, { kind: "subject", subject: "monarch" }, names);
    expect(rows.map((row) => row.spans.map((span) => span.name))).toEqual([["ヘンリ7世"], []]);
  });

  it("主題が首相・大統領などなら、行ごとに首脳の在任を並べる", () => {
    const rows = rowsForView(data, { kind: "subject", subject: "leader" }, names);
    expect(rows.map((row) => row.spans.map((span) => span.name))).toEqual([["ウォルポール"], []]);
  });

  it("国・地域の表示では、その行の国家・体制、君主、首相・大統領など、政権を 4 行で並べる", () => {
    const rows = rowsForView(data, { kind: "lane", laneId: "england" }, names);
    expect(rows.map((row) => [row.id, row.name, row.spans.map((span) => span.name)])).toEqual([
      ["regime", "国家・体制", ["ヨーク家", "テューダー朝"]],
      ["monarch", "君主", ["ヘンリ7世"]],
      ["leader", "首相・大統領など", ["ウォルポール"]],
      ["government", "政権", ["内閣"]],
    ]);
  });

  it("王朝も在位もない行を選んでも、空の 4 行を返す", () => {
    const rows = rowsForView(data, { kind: "lane", laneId: "empty" }, names);
    expect(rows).toEqual([
      { id: "regime", name: "国家・体制", spans: [] },
      { id: "monarch", name: "君主", spans: [] },
      { id: "leader", name: "首相・大統領など", spans: [] },
      { id: "government", name: "政権", spans: [] },
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
      { kind: "subject", subject: "regime" },
      { kind: "subject", subject: "government" },
      { kind: "subject", subject: "monarch" },
      { kind: "subject", subject: "leader" },
      { kind: "lane", laneId: "england" },
    ] as const;
    expect(views.map(viewToValue)).toEqual([
      "subject:regime",
      "subject:government",
      "subject:monarch",
      "subject:leader",
      "lane:england",
    ]);
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
      "subject:reign",
      "subject:dynasty",
      "lane:nowhere",
      "lane:england:extra",
      "country:england",
    ]) {
      expect(valueToView(value, laneIds)).toBeNull();
    }
  });
});
