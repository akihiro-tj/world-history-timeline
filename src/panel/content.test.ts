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
      reigns: [
        "poincare-1926",
        "poincare-1912",
        "poincare-1913",
        "napoleon-1799",
        "napoleon-1804",
        "pippin-741",
        "pippin-751",
      ],
    },
  ],
  dynasties: [
    {
      id: "stuart-like",
      name: "ステュアート朝",
      kind: "regime",
      start: y(1603),
      end: y(1649),
      sources: [wp("ステュアート朝")],
      notes: ["期間の理由"],
    },
    {
      id: "commune",
      name: "パリ=コミューン",
      kind: "government",
      start: y(1871),
      end: y(1871),
      sources: [wp("パリ・コミューン"), wp("パリ・コミューン"), wp("第三共和政")],
      notes: [],
    },
  ],
  people: [
    { id: "poincare", name: "ポワンカレ" },
    { id: "napoleon", name: "ナポレオン1世" },
    { id: "pippin", name: "ピピン" },
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
      sources: [wp("レイモン・ポアンカレ"), wp("フランスの首相")],
      notes: ["B"],
    },
    {
      id: "poincare-1912",
      personId: "poincare",
      name: null,
      role: "leader",
      title: "首相",
      start: y(1912),
      end: y(1913),
      sources: [wp("レイモン・ポアンカレ")],
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
      sources: [wp("レイモン・ポアンカレ"), wp("フランスの大統領")],
      notes: ["A"],
    },
    {
      id: "napoleon-1799",
      personId: "napoleon",
      name: "ナポレオン=ボナパルト",
      role: "leader",
      title: "第一統領",
      start: y(1799),
      end: y(1804),
      sources: [wp("ナポレオン・ボナパルト")],
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
      sources: [wp("ナポレオン・ボナパルト")],
      notes: [],
    },
    {
      id: "pippin-741",
      personId: "pippin",
      name: null,
      role: "leader",
      title: "宮宰",
      start: y(741),
      end: y(751),
      sources: [wp("ピピン3世")],
      notes: [],
    },
    {
      id: "pippin-751",
      personId: "pippin",
      name: null,
      role: "monarch",
      title: "フランク王",
      start: y(751),
      end: y(768),
      sources: [wp("ピピン3世")],
      notes: [],
    },
  ],
};

describe("panelContent", () => {
  it("王朝は出典をリンクにし、期間を 1 行にする", () => {
    expect(panelContent(data, { laneId: "france", key: "dynasty:stuart-like" })).toEqual({
      name: "ステュアート朝",
      section: "period",
      links: [wp("ステュアート朝")],
      rows: [
        { id: "stuart-like", start: y(1603), end: y(1649), title: null, notes: ["期間の理由"] },
      ],
    });
  });

  it("同じ URL の出典は 1 つにする", () => {
    expect(panelContent(data, { laneId: "france", key: "dynasty:commune" })?.links).toEqual([
      wp("パリ・コミューン"),
      wp("第三共和政"),
    ]);
  });

  it("在位のまとまりは年の順に並べ、注記はその在任の行に付け、出典は年の順に重ねずに集める", () => {
    const content = panelContent(data, {
      laneId: "france",
      key: "reign:leader/poincare/ポワンカレ",
    });
    expect(content?.name).toBe("ポワンカレ");
    expect(content?.section).toBe("leader");
    expect(content?.rows.map((r) => [r.id, r.title, r.notes])).toEqual([
      ["poincare-1912", "首相", []],
      ["poincare-1913", "大統領", ["A"]],
      ["poincare-1926", "首相", ["B"]],
    ]);
    expect(content?.links).toEqual([
      wp("レイモン・ポアンカレ"),
      wp("フランスの大統領"),
      wp("フランスの首相"),
    ]);
  });

  it("表示名が違う在位は別のまとまりにする", () => {
    const consul = panelContent(data, {
      laneId: "france",
      key: "reign:leader/napoleon/ナポレオン=ボナパルト",
    });
    expect(consul?.rows.map((r) => r.id)).toEqual(["napoleon-1799"]);
    expect(consul?.section).toBe("leader");
    const emperor = panelContent(data, {
      laneId: "france",
      key: "reign:monarch/napoleon/ナポレオン1世",
    });
    expect(emperor?.rows.map((r) => r.id)).toEqual(["napoleon-1804"]);
    expect(emperor?.section).toBe("monarch");
  });

  it("同じ人物・同じ表示名でも役割が違う在位は別のまとまりにする", () => {
    const leader = panelContent(data, { laneId: "france", key: "reign:leader/pippin/ピピン" });
    expect(leader?.section).toBe("leader");
    expect(leader?.rows.map((r) => r.id)).toEqual(["pippin-741"]);
    const monarch = panelContent(data, { laneId: "france", key: "reign:monarch/pippin/ピピン" });
    expect(monarch?.section).toBe("monarch");
    expect(monarch?.rows.map((r) => r.id)).toEqual(["pippin-751"]);
  });

  it("見つからない項目は null", () => {
    expect(panelContent(data, { laneId: "france", key: "dynasty:none" })).toBeNull();
    expect(panelContent(data, { laneId: "england", key: "dynasty:stuart-like" })).toBeNull();
    expect(panelContent(data, { laneId: "france", key: "reign:leader/nobody/x" })).toBeNull();
  });

  it("同じ人の在位は世紀の幅で並べる", () => {
    const reign = data.reigns[0];
    if (!reign) throw new Error("テストデータがありません");
    const later = { ...reign, id: "later", start: y(-1450), end: y(-1440) };
    const earlier = {
      ...reign,
      id: "earlier",
      start: { century: -15, part: null, circa: false },
      end: y(-1460),
    };
    const lane = { id: "x", name: "x", dynasties: [], reigns: ["later", "earlier"] };
    const content = panelContent(
      { ...data, lanes: [lane], reigns: [later, earlier] },
      { laneId: "x", key: "reign:leader/poincare/ポワンカレ" },
    );
    expect(content?.rows.map((r) => r.id)).toEqual(["earlier", "later"]);
  });
});
