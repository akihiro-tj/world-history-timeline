import { describe, expect, it } from "vitest";
import { parseTimeline } from "./timeline";

const wp = (title: string) => ({
  label: `Wikipedia「${title}」`,
  url: `https://ja.wikipedia.org/wiki/${title}`,
});

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
        sources: [wp("テューダー朝")],
        notes: [],
      },
    ],
    people: [{ id: "henry-vii", name: "ヘンリ7世" }],
    reigns: [
      {
        id: "henry-vii",
        personId: "henry-vii",
        name: null,
        role: "monarch",
        title: "イングランド王",
        start: { year: 1485, circa: false },
        end: { year: 1509, circa: false },
        sources: [wp("ヘンリー7世 (イングランド王)")],
        notes: [],
      },
    ],
  };
}

describe("parseTimeline", () => {
  it("世紀・千年紀の年を読める", () => {
    const data = valid();
    const start = { century: -27, part: null, circa: true };
    const end = { millennium: -2, part: "second-half", circa: false };
    Object.assign(data.dynasties[0] ?? {}, { start, end });
    expect(parseTimeline(data).dynasties[0]).toMatchObject({ start, end });
  });

  it("0 の世紀は例外にする", () => {
    const data = valid();
    Object.assign(data.dynasties[0] ?? {}, { start: { century: 0, part: null, circa: false } });
    expect(() => parseTimeline(data)).toThrow("century は 0 でない整数です");
  });

  it("知らない部分は例外にする", () => {
    const data = valid();
    Object.assign(data.dynasties[0] ?? {}, { start: { century: -5, part: "end", circa: false } });
    expect(() => parseTimeline(data)).toThrow(
      "part は early・middle・late・first-half・second-half か null です",
    );
  });

  it("year と century の両方を持つ値は例外にする", () => {
    const data = valid();
    const start = { year: -500, century: -5, part: null, circa: false };
    Object.assign(data.dynasties[0] ?? {}, { start });
    expect(() => parseTimeline(data)).toThrow("知らないキー year");
  });

  it("開始と終了が同じ世紀でも読める", () => {
    const data = valid();
    const c = { century: -26, part: null, circa: true };
    Object.assign(data.reigns[0] ?? {}, { start: c, end: c });
    expect(() => parseTimeline(data)).not.toThrow();
  });

  it("世紀の幅で比べても開始が終了より後なら例外にする", () => {
    const data = valid();
    const start = { century: -5, part: null, circa: false };
    Object.assign(data.reigns[0] ?? {}, { start, end: { year: -600, circa: false } });
    expect(() => parseTimeline(data)).toThrow("開始が終了より後です");
  });

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

  it("出典と注記と地位を読める", () => {
    const data = valid();
    Object.assign(data.dynasties[0] ?? {}, { notes: ["注記の文"] });
    const parsed = parseTimeline(data);
    expect(parsed.dynasties[0]?.sources).toEqual([wp("テューダー朝")]);
    expect(parsed.dynasties[0]?.notes).toEqual(["注記の文"]);
    expect(parsed.reigns[0]?.title).toBe("イングランド王");
  });

  it("人物に知らないキーがあれば例外にする", () => {
    const data = valid();
    Object.assign(data.people[0] ?? {}, { wikidata: "Q1" });
    expect(() => parseTimeline(data)).toThrow("知らないキー wikidata");
  });

  it("地位が空なら例外にする", () => {
    const data = valid();
    Object.assign(data.reigns[0] ?? {}, { title: "" });
    expect(() => parseTimeline(data)).toThrow("文字列が空です");
  });

  it("出典がなければ例外にする", () => {
    const dynasty = valid();
    Object.assign(dynasty.dynasties[0] ?? {}, { sources: [] });
    expect(() => parseTimeline(dynasty)).toThrow("出典がありません");
    const reign = valid();
    Object.assign(reign.reigns[0] ?? {}, { sources: [] });
    expect(() => parseTimeline(reign)).toThrow("出典がありません");
  });

  it("注記の文や出典の名前が空なら例外にする", () => {
    const note = valid();
    Object.assign(note.reigns[0] ?? {}, { notes: [""] });
    expect(() => parseTimeline(note)).toThrow("文字列が空です");
    const label = valid();
    Object.assign(label.reigns[0] ?? {}, {
      sources: [{ label: "", url: "https://ja.wikipedia.org/wiki/x" }],
    });
    expect(() => parseTimeline(label)).toThrow("文字列が空です");
  });

  it("最初の出典には Wikipedia と公的機関などの https のページを書ける", () => {
    for (const url of [
      "https://ja.wikipedia.org/w/index.php?title=x&oldid=1",
      "https://www.royal.uk/henry-vii",
      "https://www.gov.uk/government/history/past-prime-ministers/robert-walpole",
    ]) {
      const data = valid();
      Object.assign(data.dynasties[0] ?? {}, { sources: [{ label: "x", url }] });
      expect(() => parseTimeline(data)).not.toThrow();
    }
  });

  it("最初の出典の url が https でない、または null なら例外にする", () => {
    for (const url of ["http://ja.wikipedia.org/wiki/x", "javascript:alert(1)", null]) {
      const data = valid();
      Object.assign(data.dynasties[0] ?? {}, { sources: [{ label: "x", url }] });
      expect(() => parseTimeline(data)).toThrow("最初の出典の url は https で始まる URL です");
    }
  });

  it("2 つ目からの出典には Wikipedia 以外のページと URL のない資料を書ける", () => {
    const sources = [
      { label: "Wikipedia「x」", url: "https://ja.wikipedia.org/wiki/x" },
      { label: "Britannica「Knossos」", url: "https://www.britannica.com/place/Knossos" },
      { label: "著者『本』（2005年）", url: null },
    ];
    const data = valid();
    Object.assign(data.dynasties[0] ?? {}, { sources });
    expect(parseTimeline(data).dynasties[0]?.sources).toEqual(sources);
  });

  it("2 つ目からの出典の url が https でなければ例外にする", () => {
    for (const url of ["http://example.com/", "javascript:alert(1)"]) {
      const data = valid();
      Object.assign(data.dynasties[0] ?? {}, {
        sources: [
          { label: "Wikipedia「x」", url: "https://ja.wikipedia.org/wiki/x" },
          { label: "y", url },
        ],
      });
      expect(() => parseTimeline(data)).toThrow("出典の url は https で始まる URL か null です");
    }
  });
});
