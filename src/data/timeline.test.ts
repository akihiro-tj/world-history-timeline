import { describe, expect, it } from "vitest";
import { parseTimeline } from "./timeline";

function valid() {
  return {
    lanes: [{ id: "england", name: "イングランド", dynasties: ["tudor"], reigns: ["henry-vii"] }],
    dynasties: [
      {
        id: "tudor",
        name: "テューダー朝",
        start: { year: 1485, circa: false },
        end: { year: 1603, circa: false },
      },
    ],
    people: [{ id: "henry-vii", name: "ヘンリ7世" }],
    reigns: [
      {
        id: "henry-vii",
        personId: "henry-vii",
        start: { year: 1485, circa: false },
        end: { year: 1509, circa: false },
      },
    ],
  };
}

describe("parseTimeline", () => {
  it("正しいデータをそのまま返す", () => {
    expect(parseTimeline(valid())).toEqual(valid());
  });

  it("空の配列だけのデータも読み込める", () => {
    const empty = { lanes: [], dynasties: [], people: [], reigns: [] };
    expect(parseTimeline(empty)).toEqual(empty);
  });

  it("知らないキーがあれば例外にする", () => {
    const data = valid();
    Object.assign(data.people[0] ?? {}, { note: "テスト" });
    expect(() => parseTimeline(data)).toThrow("知らないキー note");
  });

  it("欠けたキーがあれば例外にする", () => {
    const data: Record<string, unknown> = valid();
    delete data.reigns;
    expect(() => parseTimeline(data)).toThrow("キー reigns がありません");
  });

  it("年が整数でなければ例外にする", () => {
    const data = valid();
    (data.dynasties[0] as { start: unknown }).start = { year: "1485", circa: false };
    expect(() => parseTimeline(data)).toThrow("year は整数です");
  });

  it("circa が真偽値でなければ例外にする", () => {
    const data = valid();
    (data.dynasties[0] as { start: unknown }).start = { year: 1485, circa: "false" };
    expect(() => parseTimeline(data)).toThrow("circa は真偽値です");
  });

  it("開始が終了より後なら例外にする", () => {
    const data = valid();
    (data.reigns[0] as { end: unknown }).end = { year: 1484, circa: false };
    expect(() => parseTimeline(data)).toThrow("開始が終了より後です");
  });

  it("存在しない人物を参照していれば例外にする", () => {
    const data = valid();
    (data.reigns[0] as { personId: string }).personId = "henry-viii";
    expect(() => parseTimeline(data)).toThrow("存在しない人物を参照しています: henry-viii");
  });

  it("行が存在しない王朝を参照していれば例外にする", () => {
    const data = valid();
    (data.lanes[0] as { dynasties: string[] }).dynasties = ["stuart"];
    expect(() => parseTimeline(data)).toThrow("存在しない id を参照しています: stuart");
  });

  it("id が重複していれば例外にする", () => {
    const data = valid();
    data.people.push({ id: "henry-vii", name: "ヘンリ7世" });
    expect(() => parseTimeline(data)).toThrow("id が重複しています: henry-vii");
  });

  it("名前が空なら例外にする", () => {
    const data = valid();
    (data.people[0] as { name: string }).name = " ";
    expect(() => parseTimeline(data)).toThrow("名前が空です");
  });

  it("配列でなければ例外にする", () => {
    expect(() => parseTimeline([])).toThrow("オブジェクトではありません");
  });
});
