import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import {
  assignTracks,
  labelRowStart,
  labelRowsTotal,
  layoutLane,
  ticks,
  timeRange,
  yearToOffset,
} from "./layout";
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
      dynasties: [{ id: "a", name: "A", start: y(481), end: y(751) }],
      people: [{ id: "p", name: "P" }],
      reigns: [{ id: "r", personId: "p", start: y(1485), end: y(1603) }],
    };
    expect(timeRange(data)).toEqual({ from: 400, to: 1700 });
  });

  it("紀元前も区切りにそろえる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", start: y(-221), end: y(-206) }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data)).toEqual({ from: -300, to: -200 });
  });

  it("区切りちょうどの 1 点だけでも幅を持たせる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", start: y(1500), end: y(1500) }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data)).toEqual({ from: 1500, to: 1600 });
  });

  it("データが無ければ null", () => {
    expect(timeRange({ lanes: [], dynasties: [], people: [], reigns: [] })).toBeNull();
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
    );
    expect(lane.bars[0]).toMatchObject({ offset: 174, length: 18, track: 0, labelRow: 0 });
    // 名前と期間を 2 行に積んだ太さ
    expect(lane.labelRowSizes).toEqual([38]);
  });

  it("横向きで幅が足りれば棒の中に入れる", () => {
    const lane = layoutLane([span("capet", "カペー朝", 987, 1100)], range, "horizontal", measure);
    expect(lane.bars[0]?.labelRow).toBeNull();
    expect(lane.labelRowSizes).toEqual([]);
  });

  it("外に出したラベルが重なるなら次の段にずらす", () => {
    const lane = layoutLane(
      [span("a", "アアアアアアアア", 1000, 1005), span("b", "イイイ", 1010, 1015)],
      range,
      "horizontal",
      measure,
    );
    // a のラベルは 200px から 96px（期間 9 文字の 90px と間隔 6px）。b は 220px から始まるので重なる
    expect(lane.bars.map((bar) => bar.labelRow)).toEqual([0, 1]);
  });

  it("外に出したラベルが重ならなければ同じ段に置く", () => {
    const lane = layoutLane(
      [span("a", "アア", 1000, 1005), span("b", "イイ", 1050, 1055)],
      range,
      "horizontal",
      measure,
    );
    expect(lane.bars.map((bar) => bar.labelRow)).toEqual([0, 0]);
  });

  it("縦向きは 1 行分の長さがあれば棒の中に入れる", () => {
    // 1 行に 18px（16px と両端の隙間 2px）が要る。9 年（18px）なら中、8 年（16px）なら外
    const lane = layoutLane(
      [span("a", "ユーグ=カペー", 987, 996), span("b", "短い", 1000, 1008)],
      range,
      "vertical",
      measure,
    );
    expect(lane.bars.map((bar) => bar.labelRow)).toEqual([null, 0]);
    // 縦向きのラベルの太さは名前か期間の長いほうの幅
    expect(lane.labelRowSizes).toEqual([96]);
  });

  it("ラベルが範囲の末端を越えるなら extent を伸ばす", () => {
    const lane = layoutLane([span("a", "アアアアア", 1095, 1100)], range, "horizontal", measure);
    expect(lane.extent).toBe(390 + 96);
  });

  it("棒が無い行は段も 0", () => {
    expect(layoutLane([], range, "horizontal", measure)).toEqual({
      bars: [],
      trackCount: 0,
      labelRowSizes: [],
      extent: 400,
    });
  });
});

describe("labelRowStart", () => {
  it("前の段の太さと間隔を足す", () => {
    expect(labelRowStart([38, 20], 0)).toBe(0);
    expect(labelRowStart([38, 20], 1)).toBe(42);
    expect(labelRowsTotal([38, 20])).toBe(66);
    expect(labelRowsTotal([])).toBe(0);
  });
});
