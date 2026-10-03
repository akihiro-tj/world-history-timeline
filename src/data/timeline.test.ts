import { describe, expect, it } from "vitest";
import { parseTimeline } from "./timeline";

function valid() {
  return {
    lanes: [{ id: "england", name: "イングランド", dynasties: ["tudor"], reigns: ["henry-vii"] }],
    dynasties: [
      {
        id: "tudor",
        name: "テューダー朝",
        kind: "regime",
        start: { year: 1485, circa: false },
        end: { year: 1603, circa: false },
        wikidata: "Q12345",
        wikidataLabel: "テューダー朝",
        notes: [],
      },
    ],
    people: [
      { id: "henry-vii", name: "ヘンリ7世", wikidata: "Q130005", wikidataLabel: "ヘンリー7世" },
    ],
    reigns: [
      {
        id: "henry-vii",
        personId: "henry-vii",
        name: null,
        role: "monarch",
        title: "イングランド王",
        start: { year: 1485, circa: false },
        end: { year: 1509, circa: false },
        notes: [],
      },
    ],
  };
}

const note = (url: string, label = "Wikipedia「x」") => ({
  reason: "理由の文",
  refs: [{ label, url }],
});

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

  it("終わりが null の期間（現在まで）を読める", () => {
    const data = valid();
    (data.dynasties[0] as { end: unknown }).end = null;
    expect(parseTimeline(data).dynasties[0]?.end).toBeNull();
  });

  it("知らない種類の王朝なら例外にする", () => {
    const data = valid();
    (data.dynasties[0] as { kind: string }).kind = "dynasty";
    expect(() => parseTimeline(data)).toThrow("kind は regime か government です");
  });

  it("在位の表示名を読める", () => {
    const data = valid();
    (data.reigns[0] as { name: unknown }).name = "ルイ=ナポレオン";
    expect(parseTimeline(data).reigns[0]?.name).toBe("ルイ=ナポレオン");
  });

  it("知らない役割なら例外にする", () => {
    const data = valid();
    (data.reigns[0] as { role: string }).role = "king";
    expect(() => parseTimeline(data)).toThrow("role は monarch か leader です");
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

  it("行が同じ王朝を 2 回参照していれば例外にする", () => {
    const data = valid();
    (data.lanes[0] as { dynasties: string[] }).dynasties = ["tudor", "tudor"];
    expect(() => parseTimeline(data)).toThrow("同じ id を 2 回参照しています: tudor");
  });

  it("id の形式が不正なら例外にする", () => {
    const data = valid();
    (data.people[0] as { id: string }).id = "Henry VII";
    expect(() => parseTimeline(data)).toThrow("id が不正です");
  });

  it("id が重複していれば例外にする", () => {
    const data = valid();
    data.people.push({
      id: "henry-vii",
      name: "ヘンリ7世",
      wikidata: "Q130005",
      wikidataLabel: "ヘンリー7世",
    });
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
  it("Wikidata の項目と注記と地位を読める", () => {
    const data = valid();
    (data.dynasties[0] as { notes: unknown[] }).notes = [note("https://ja.wikipedia.org/wiki/x")];
    const parsed = parseTimeline(data);
    expect(parsed.dynasties[0]?.wikidata).toBe("Q12345");
    expect(parsed.dynasties[0]?.notes).toEqual([note("https://ja.wikipedia.org/wiki/x")]);
    expect(parsed.reigns[0]?.title).toBe("イングランド王");
  });

  it("Wikidata の項目がなければ ID もラベルも null", () => {
    const data = valid();
    Object.assign(data.people[0] ?? {}, { wikidata: null, wikidataLabel: null });
    expect(parseTimeline(data).people[0]?.wikidata).toBeNull();
  });

  it("Wikidata の ID が不正なら例外にする", () => {
    const data = valid();
    Object.assign(data.dynasties[0] ?? {}, { wikidata: "12345" });
    expect(() => parseTimeline(data)).toThrow("Wikidata の ID が不正です");
  });

  it("Wikidata の項目がないのにラベルがあれば例外にする", () => {
    const data = valid();
    Object.assign(data.people[0] ?? {}, { wikidata: null });
    expect(() => parseTimeline(data)).toThrow("Wikidata の項目がないのに wikidataLabel があります");
  });

  it("地位が空なら例外にする", () => {
    const data = valid();
    Object.assign(data.reigns[0] ?? {}, { title: "" });
    expect(() => parseTimeline(data)).toThrow("文字列が空です");
  });

  it("注記の理由やリンクの名前が空なら例外にする", () => {
    const empty = valid();
    Object.assign(empty.reigns[0] ?? {}, {
      notes: [{ ...note("https://ja.wikipedia.org/wiki/x"), reason: "" }],
    });
    expect(() => parseTimeline(empty)).toThrow("文字列が空です");
    const label = valid();
    Object.assign(label.reigns[0] ?? {}, { notes: [note("https://ja.wikipedia.org/wiki/x", "")] });
    expect(() => parseTimeline(label)).toThrow("文字列が空です");
  });

  it("リンクは言語版つきの Wikipedia と Wikidata だけを許す", () => {
    for (const url of [
      "https://fr.wikipedia.org/wiki/Troisième_République",
      "https://zh-yue.wikipedia.org/wiki/x",
      "https://www.wikidata.org/wiki/Q1",
    ]) {
      const data = valid();
      Object.assign(data.dynasties[0] ?? {}, { notes: [note(url)] });
      expect(() => parseTimeline(data)).not.toThrow();
    }
    for (const url of [
      "http://ja.wikipedia.org/wiki/x",
      "https://example.com/",
      "javascript:alert(1)",
    ]) {
      const data = valid();
      Object.assign(data.dynasties[0] ?? {}, { notes: [note(url)] });
      expect(() => parseTimeline(data)).toThrow("url は Wikipedia か Wikidata のページです");
    }
  });
});
