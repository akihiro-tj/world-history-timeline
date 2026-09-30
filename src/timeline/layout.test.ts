import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { assignTracks, layoutLane, ticks, timeRange, yearToOffset } from "./layout";
import type { Span } from "./spans";

const y = (year: number) => ({ year, circa: false });
const span = (id: string, name: string, start: number, end: number): Span => ({
  id,
  name,
  start: y(start),
  end: y(end),
});
// 1 文字 10px として幅を測る
const measure = (text: string) => text.length * 10;

describe("timeRange", () => {
  it("王朝と在位のすべての年を含み、100 年の区切りにそろえる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", kind: "regime", start: y(481), end: y(751) }],
      people: [{ id: "p", name: "P" }],
      reigns: [{ id: "r", personId: "p", role: "monarch", start: y(1485), end: y(1603) }],
    };
    expect(timeRange(data, 2026)).toEqual({ from: 400, to: 1700 });
  });

  it("紀元前も区切りにそろえる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", kind: "regime", start: y(-221), end: y(-206) }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data, 2026)).toEqual({ from: -300, to: -200 });
  });

  it("区切りちょうどの 1 点だけでも幅を持たせる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", kind: "regime", start: y(1500), end: y(1500) }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data, 2026)).toEqual({ from: 1500, to: 1600 });
  });

  it("現在まで続く期間は現在の年までを含める", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", kind: "regime", start: y(1958), end: null }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data, 2026)).toEqual({ from: 1900, to: 2100 });
  });

  it("データが無ければ null", () => {
    expect(timeRange({ lanes: [], dynasties: [], people: [], reigns: [] }, 2026)).toBeNull();
  });
});

describe("ticks と yearToOffset", () => {
  it("100 年ごとの目盛りを返す", () => {
    expect(ticks({ from: 400, to: 700 })).toEqual([400, 500, 600, 700]);
  });

  it("1 年を 2px に換算する", () => {
    expect(yearToOffset(481, { from: 400, to: 700 })).toBe(162);
  });
});

describe("assignTracks", () => {
  it("終わりと次の始まりが同じ年なら同じ段に置く", () => {
    // ジョン王 1199–1216 とヘンリ3世 1216–1272
    expect(
      assignTracks([
        { start: 1199, end: 1216 },
        { start: 1216, end: 1272 },
      ]),
    ).toEqual([0, 0]);
  });

  it("期間が重なる棒は次の段に置き、空いた段は使い回す", () => {
    expect(
      assignTracks([
        { start: 420, end: 479 },
        { start: 386, end: 534 },
        { start: 479, end: 502 },
      ]),
    ).toEqual([1, 0, 1]);
  });

  it("空の配列なら空の配列", () => {
    expect(assignTracks([])).toEqual([]);
  });
});

describe("layoutLane", () => {
  const range = { from: 900, to: 1100 };

  it("横向きで幅の足りない名前は棒の外に出す", () => {
    // ユーグ=カペー 987–996 は 18px。名前 70px は入らない
    const lane = layoutLane(
      [span("hugues", "ユーグ=カペー", 987, 996)],
      range,
      "horizontal",
      measure,
      2026,
    );
    // ラベルは棒（太さ 36px）のすぐ下（間隔 4px）に置く
    expect(lane.bars[0]).toMatchObject({ offset: 174, length: 18, track: 0, labelCross: 40 });
    // 名前と期間を 2 行に積んだ太さ 38px の分だけ行が太くなる
    expect(lane.crossExtent).toBe(78);
  });

  it("横向きで幅が足りれば棒の中に入れる", () => {
    const lane = layoutLane(
      [span("capet", "カペー朝", 987, 1100)],
      range,
      "horizontal",
      measure,
      2026,
    );
    expect(lane.bars[0]?.labelCross).toBeNull();
    expect(lane.crossExtent).toBe(36);
  });

  it("外に出したラベルが重なるなら次の段にずらす", () => {
    const lane = layoutLane(
      [span("a", "アアアアアアアア", 1000, 1005), span("b", "イイイ", 1010, 1015)],
      range,
      "horizontal",
      measure,
      2026,
    );
    // a のラベルは 200px から 96px（期間 9 文字の 90px と間隔 6px）。b は 220px から始まるので重なる
    expect(lane.bars.map((bar) => bar.labelCross)).toEqual([40, 82]);
  });

  it("外に出したラベルが重ならなければ同じ段に置く", () => {
    const lane = layoutLane(
      [span("a", "アア", 1000, 1005), span("b", "イイ", 1050, 1055)],
      range,
      "horizontal",
      measure,
      2026,
    );
    expect(lane.bars.map((bar) => bar.labelCross)).toEqual([40, 40]);
  });

  it("ラベルが 2 段目の棒と重なるなら、その棒の外側に置く", () => {
    // b は a と期間が重なるので 2 段目（cross 40px）。a のラベル（200〜296px）は b（206〜400px）と重なる
    const lane = layoutLane(
      [span("a", "アア", 1000, 1005), span("b", "イイ", 1003, 1100)],
      range,
      "horizontal",
      measure,
      2026,
    );
    expect(lane.bars.map((bar) => [bar.track, bar.labelCross])).toEqual([
      [0, 80],
      [1, null],
    ]);
  });

  it("2 段目の棒がラベルと重ならなければ、ラベルを自分の棒のすぐ外側に置く", () => {
    // d は 2 段目だが 320px から始まり、a のラベル（200〜296px）とは重ならない
    const lane = layoutLane(
      [span("a", "アア", 1000, 1005), span("c", "ウウ", 1050, 1200), span("d", "エエ", 1060, 1150)],
      { from: 900, to: 1300 },
      "horizontal",
      measure,
      2026,
    );
    expect(lane.bars.map((bar) => [bar.track, bar.labelCross])).toEqual([
      [0, 40],
      [0, null],
      [1, null],
    ]);
  });

  it("縦向きは 1 行に収まれば、名前と期間を 1 行で棒の中に入れる", () => {
    // 名前 20px + 間隔 4px + 期間 70px + 余白 12px = 106px が棒の幅 112px に収まり、長さ 18px で 1 行分ある
    const lane = layoutLane([span("a", "アア", 987, 996)], range, "vertical", measure, 2026);
    expect(lane.bars[0]).toMatchObject({ inside: "row", labelCross: null });
  });

  it("縦向きで 1 行に収まらなくても、2 行分の長さがあれば積んで棒の中に入れる", () => {
    // 1 行なら 176px で入らない。長いほうの期間 90px + 余白 12px は入り、長さ 60px は 2 行分（34px）ある
    const lane = layoutLane(
      [span("a", "アアアアアアア", 1000, 1030)],
      range,
      "vertical",
      measure,
      2026,
    );
    expect(lane.bars[0]).toMatchObject({ inside: "stack", labelCross: null });
  });

  it("縦向きで名前が棒の幅に収まらなければ、長い棒でも外に出す", () => {
    // 名前 110px + 余白 12px は 112px を超える
    const lane = layoutLane(
      [span("a", "アアアアアアアアアアア", 1000, 1090)],
      range,
      "vertical",
      measure,
      2026,
    );
    expect(lane.bars[0]).toMatchObject({ inside: null, labelCross: 116 });
  });

  it("縦向きで 1 行分の長さがなければ外に出し、棒のすぐ右に置く", () => {
    // 8 年（16px）は 1 行分（18px）に足りない
    const lane = layoutLane([span("b", "短い", 1000, 1008)], range, "vertical", measure, 2026);
    // ラベルは棒（幅 112px）のすぐ右（間隔 4px）に置く
    expect(lane.bars[0]).toMatchObject({ inside: null, labelCross: 116 });
    // 縦向きのラベルの太さは名前か期間の長いほうの幅と間隔
    expect(lane.crossExtent).toBe(116 + 96);
  });

  it("ラベルが範囲の末端を越えるなら extent を伸ばす", () => {
    const lane = layoutLane(
      [span("a", "アアアアア", 1095, 1100)],
      range,
      "horizontal",
      measure,
      2026,
    );
    expect(lane.extent).toBe(390 + 96);
  });

  it("開始と終了が同じ年の棒は 1 年分の長さを持ち、次の年に始まる棒と同じ段に並ぶ", () => {
    const lane = layoutLane(
      [span("a", "ア", 1000, 1000), span("b", "イ", 1001, 1010)],
      range,
      "horizontal",
      measure,
      2026,
    );
    expect(lane.bars.map((bar) => [bar.length, bar.track, bar.period])).toEqual([
      [2, 0, "1000"],
      [18, 0, "1001–1010"],
    ]);
  });

  it("同じ年の棒どうしは重なるものとして段を分ける", () => {
    const lane = layoutLane(
      [span("a", "ア", 1000, 1000), span("b", "イ", 1000, 1000)],
      range,
      "horizontal",
      measure,
      2026,
    );
    expect(lane.bars.map((bar) => bar.track)).toEqual([0, 1]);
  });

  it("現在まで続く棒は現在の年で終わる", () => {
    const bar = { id: "a", name: "ア", start: y(1000), end: null };
    const lane = layoutLane([bar], range, "horizontal", measure, 1050);
    expect(lane.bars[0]).toMatchObject({ offset: 200, length: 100, period: "1000–現在" });
  });

  it("棒が無い行は段も 0", () => {
    expect(layoutLane([], range, "horizontal", measure, 2026)).toEqual({
      bars: [],
      crossExtent: 0,
      extent: 400,
    });
  });
});
