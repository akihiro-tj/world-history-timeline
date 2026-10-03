import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { panelContent } from "./content";

const y = (year: number) => ({ year, circa: false });
const wp = (title: string) => ({
  label: `Wikipedia「${title}」`,
  url: `https://ja.wikipedia.org/wiki/${title}`,
});

const data: TimelineData = {
  lanes: [
    {
      id: "france",
      name: "フランス",
      dynasties: ["stuart-like", "commune"],
      reigns: ["poincare-1926", "poincare-1912", "poincare-1913", "napoleon-1799", "napoleon-1804"],
    },
  ],
  dynasties: [
    {
      id: "stuart-like",
      name: "ステュアート朝",
      kind: "regime",
      start: y(1603),
      end: y(1649),
      wikidata: "Q1",
      wikidataLabel: "ステュアート家",
      notes: [{ reason: "期間の理由", refs: [wp("ステュアート朝")] }],
    },
    {
      id: "commune",
      name: "パリ=コミューン",
      kind: "government",
      start: y(1871),
      end: y(1871),
      wikidata: null,
      wikidataLabel: null,
      notes: [{ reason: "補った理由", refs: [wp("パリ・コミューン")] }],
    },
  ],
  people: [
    { id: "poincare", name: "ポワンカレ", wikidata: "Q2", wikidataLabel: "レイモン・ポアンカレ" },
    {
      id: "napoleon",
      name: "ナポレオン1世",
      wikidata: "Q3",
      wikidataLabel: "ナポレオン・ボナパルト",
    },
  ],
  reigns: [
    {
      id: "poincare-1926",
      personId: "poincare",
      name: null,
      role: "leader",
      title: "首相",
      start: y(1926),
      end: y(1929),
      notes: [{ reason: "B", refs: [wp("ポワンカレ")] }],
    },
    {
      id: "poincare-1912",
      personId: "poincare",
      name: null,
      role: "leader",
      title: "首相",
      start: y(1912),
      end: y(1913),
      notes: [],
    },
    {
      id: "poincare-1913",
      personId: "poincare",
      name: null,
      role: "leader",
      title: "大統領",
      start: y(1913),
      end: y(1920),
      notes: [{ reason: "A", refs: [wp("ポワンカレ"), wp("第三共和政")] }],
    },
    {
      id: "napoleon-1799",
      personId: "napoleon",
      name: "ナポレオン=ボナパルト",
      role: "leader",
      title: "第一統領",
      start: y(1799),
      end: y(1804),
      notes: [],
    },
    {
      id: "napoleon-1804",
      personId: "napoleon",
      name: null,
      role: "monarch",
      title: "フランス皇帝",
      start: y(1804),
      end: y(1814),
      notes: [],
    },
  ],
};

describe("panelContent", () => {
  it("王朝は Wikidata のリンクと注記の資料を出典にし、期間を 1 行にする", () => {
    expect(panelContent(data, { laneId: "france", key: "dynasty:stuart-like" })).toEqual({
      name: "ステュアート朝",
      section: "period",
      links: [
        { label: "Wikidata「ステュアート家」", url: "https://www.wikidata.org/wiki/Q1" },
        wp("ステュアート朝"),
      ],
      rows: [
        { id: "stuart-like", start: y(1603), end: y(1649), title: null, notes: ["期間の理由"] },
      ],
    });
  });

  it("Wikidata の項目がない王朝は、注記の資料だけを出典にする", () => {
    expect(panelContent(data, { laneId: "france", key: "dynasty:commune" })?.links).toEqual([
      wp("パリ・コミューン"),
    ]);
  });

  it("在位のまとまりは年の順に並べ、注記はその在任の行に付け、資料は年の順に重ねずに集める", () => {
    const content = panelContent(data, { laneId: "france", key: "reign:poincare/ポワンカレ" });
    expect(content?.name).toBe("ポワンカレ");
    expect(content?.section).toBe("leader");
    expect(content?.rows.map((r) => [r.id, r.title, r.notes])).toEqual([
      ["poincare-1912", "首相", []],
      ["poincare-1913", "大統領", ["A"]],
      ["poincare-1926", "首相", ["B"]],
    ]);
    expect(content?.links).toEqual([
      { label: "Wikidata「レイモン・ポアンカレ」", url: "https://www.wikidata.org/wiki/Q2" },
      wp("ポワンカレ"),
      wp("第三共和政"),
    ]);
  });

  it("表示名が違う在位は別のまとまりにする", () => {
    const consul = panelContent(data, {
      laneId: "france",
      key: "reign:napoleon/ナポレオン=ボナパルト",
    });
    expect(consul?.rows.map((r) => r.id)).toEqual(["napoleon-1799"]);
    expect(consul?.section).toBe("leader");
    const emperor = panelContent(data, { laneId: "france", key: "reign:napoleon/ナポレオン1世" });
    expect(emperor?.rows.map((r) => r.id)).toEqual(["napoleon-1804"]);
    expect(emperor?.section).toBe("monarch");
  });

  it("見つからない項目は null", () => {
    expect(panelContent(data, { laneId: "france", key: "dynasty:none" })).toBeNull();
    expect(panelContent(data, { laneId: "england", key: "dynasty:stuart-like" })).toBeNull();
    expect(panelContent(data, { laneId: "france", key: "reign:nobody/x" })).toBeNull();
  });
});
