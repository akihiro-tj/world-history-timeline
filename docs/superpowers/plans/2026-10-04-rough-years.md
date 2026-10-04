# 世紀単位の年と主題「国家・体制など」 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 成果物の世紀・千年紀単位の年を読み込み、端に幅のある棒をぼかして描き、期間を「前19世紀初め」の形で出す。主題「国家・体制」の名前を「国家・体制など」にする。

**Architecture:** 年の型と幅・比較を `src/data/year.ts` に分け、読み込み（`timeline.ts`）・表記（`format.ts`）・配置（`layout.ts`）・並べ替え（`spans.ts`・`content.ts`）がそれを使う。`layoutLane` は棒の外形と、両端のぼかす長さ（`fadeStart`・`fadeEnd`、px）を返し、棒の中の文字は確かな区間の長さで判断する。描画（`Timeline.tsx`）は、ぼかす長さがあれば背景をグラデーションにし、棒の中の文字を確かな区間の始まりに寄せる。

**Tech Stack:** React 19、TypeScript、Vite、Tailwind CSS 4、Vitest（node 環境）、Biome、pnpm

**Spec:** `docs/superpowers/specs/2026-10-04-rough-years-design.md`

## Global Constraints

- コミットメッセージは英語。コード内コメント・テスト名・ドキュメントは日本語
- ブランチ `claude/ancient-orient-design` で作業する。main に直接コミットしない
- UI 文言は spec §5・§6 のものだけ。主題の名前は「国家・体制など」。部分の文字は 初め・半ば・末・前半・後半、単位は 世紀・千年紀、「頃」は部分の後
- `Year` の幅の決め方（紀元前 n 世紀は `[-100n, -100n + 100]`、紀元後 n 世紀は `[100(n − 1), 100n]`、千年紀は 1000 年単位、3 等分・2 等分、端数は `Math.round`）
- `src/data/timeline.json` は変えない
- 各タスクの終わりに `pnpm exec biome ci .`・`pnpm typecheck`・`pnpm test`・`pnpm build` がすべて通る
- テストの期待値を観測値に合わせて書き換えない。計画と食い違ったらブロックとして報告する

## Review Focus

- 開始と終了が同じ世紀の棒（確かな区間がない）: 中ほどがいちばん濃く、両側に薄くなる（Task 3 のテスト）
- 外形は長いが確かな区間が短い棒: 棒の中に文字を入れず外に出す（Task 3 のテスト）
- 開始が世紀で終了が現在まで（`null`）の棒: 終わりはぼかさない（Task 3 のテスト）
- 出典パネルで、同じ人の在位を世紀の幅で並べる（Task 3 のテスト）
- 縦向きの棒の中の文字: 確かな区間の始まりに寄る（Task 4 の実ブラウザ）

---

### Task 1: 年の型・幅と、世紀単位の年の読み込み

**Files:**
- Create: `src/data/year.ts`, `src/data/year.test.ts`
- Modify: `src/data/timeline.ts`, `src/data/timeline.test.ts`

**Interfaces:**
- Produces（`src/data/year.ts`）: `PARTS`、`type Part`、`type Year`、`bounds(value: Year): { from: number; to: number }`、`sameYear(a: Year, b: Year): boolean`
- `src/data/timeline.ts` は `Year` を `./year` から re-export する（`export type { Year } from "./year";`）。`spans.ts`・`content.ts`・`format.ts` の `import type { Year } from "../data/timeline"` はそのまま動く

- [ ] **Step 1: テストを書く**（`src/data/year.test.ts`）

```ts
import { describe, expect, it } from "vitest";
import { bounds, sameYear } from "./year";

describe("bounds", () => {
  it("年は幅のない 1 点", () => {
    expect(bounds({ year: -221, circa: true })).toEqual({ from: -221, to: -221 });
  });

  it("紀元前と紀元後の世紀", () => {
    expect(bounds({ century: -27, part: null, circa: true })).toEqual({ from: -2700, to: -2600 });
    expect(bounds({ century: 4, part: null, circa: false })).toEqual({ from: 300, to: 400 });
  });

  it("紀元前と紀元後の千年紀", () => {
    expect(bounds({ millennium: -2, part: null, circa: false })).toEqual({ from: -2000, to: -1000 });
    expect(bounds({ millennium: 2, part: null, circa: false })).toEqual({ from: 1000, to: 2000 });
  });

  it("初め・半ば・末は 3 等分し、端数を四捨五入する", () => {
    const c = (part: "early" | "middle" | "late") => bounds({ century: -19, part, circa: false });
    expect(c("early")).toEqual({ from: -1900, to: -1867 });
    expect(c("middle")).toEqual({ from: -1867, to: -1833 });
    expect(c("late")).toEqual({ from: -1833, to: -1800 });
  });

  it("前半・後半は 2 等分する", () => {
    const m = (part: "first-half" | "second-half") => bounds({ millennium: -2, part, circa: false });
    expect(m("first-half")).toEqual({ from: -2000, to: -1500 });
    expect(m("second-half")).toEqual({ from: -1500, to: -1000 });
  });
});

describe("sameYear", () => {
  it("形・数・部分・頃がすべて同じときだけ同じ", () => {
    const c = { century: -26, part: null, circa: true };
    expect(sameYear(c, { ...c })).toBe(true);
    expect(sameYear(c, { ...c, circa: false })).toBe(false);
    expect(sameYear(c, { ...c, part: "early" })).toBe(false);
    expect(sameYear(c, { millennium: -26, part: null, circa: true })).toBe(false);
    expect(sameYear({ year: 1871, circa: false }, { year: 1871, circa: false })).toBe(true);
  });
});
```

`src/data/timeline.test.ts` の `describe("parseTimeline")` に足す。

```ts
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
```

- [ ] **Step 2:** Run: `pnpm test src/data` — Expected: FAIL（`./year` がない、`知らないキー century`）

- [ ] **Step 3: `src/data/year.ts` を書く**

```ts
// 年の値と、時間軸上の幅。年・世紀・千年紀のどれか。紀元前は負の数

// 世紀・千年紀の部分: 初め／半ば／末（3 等分）、前半／後半（2 等分）
export const PARTS = ["early", "middle", "late", "first-half", "second-half"] as const;
export type Part = (typeof PARTS)[number];
export type Year =
  | { year: number; circa: boolean }
  | { century: number; part: Part | null; circa: boolean }
  | { millennium: number; part: Part | null; circa: boolean };

// いちばん早い位置といちばん遅い位置。年なら幅のない 1 点
export function bounds(value: Year): { from: number; to: number } {
  if ("year" in value) return { from: value.year, to: value.year };
  const [n, size] = "century" in value ? [value.century, 100] : [value.millennium, 1000];
  const from = n < 0 ? n * size : (n - 1) * size;
  const at = (fraction: number) => Math.round(from + size * fraction);
  switch (value.part) {
    case null:
      return { from, to: from + size };
    case "early":
      return { from, to: at(1 / 3) };
    case "middle":
      return { from: at(1 / 3), to: at(2 / 3) };
    case "late":
      return { from: at(2 / 3), to: from + size };
    case "first-half":
      return { from, to: at(1 / 2) };
    case "second-half":
      return { from: at(1 / 2), to: from + size };
  }
}

// 形・数・部分・頃がすべて同じか（期間の開始と終了を 1 つにまとめて出すかの判断に使う）
export function sameYear(a: Year, b: Year): boolean {
  if ("year" in a) return "year" in b && a.year === b.year && a.circa === b.circa;
  if ("century" in a) {
    return "century" in b && a.century === b.century && a.part === b.part && a.circa === b.circa;
  }
  return (
    "millennium" in b && a.millennium === b.millennium && a.part === b.part && a.circa === b.circa
  );
}
```

- [ ] **Step 4: `src/data/timeline.ts` を直す**

- 先頭の `export type Year = { year: number; circa: boolean };` を消し、次にする

```ts
import { bounds, PARTS, type Part, type Year } from "./year";

export type { Year } from "./year";
```

- `year` 関数を次に置き換える

```ts
function circa(value: unknown, where: string): boolean {
  if (typeof value !== "boolean") return fail(where, "circa は真偽値です");
  return value;
}

function ordinal(value: unknown, key: string, where: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value === 0) {
    return fail(where, `${key} は 0 でない整数です`);
  }
  return value;
}

function part(value: unknown, where: string): Part | null {
  if (value === null) return null;
  const found = PARTS.find((candidate) => candidate === value);
  return found ?? fail(where, `part は ${PARTS.join("・")} か null です`);
}

// 年・世紀・千年紀のどれか。どの形かはキーで見分ける
function year(value: unknown, where: string): Year {
  const keys = typeof value === "object" && value !== null ? Object.keys(value) : [];
  if (keys.includes("century")) {
    const r = record(value, ["century", "part", "circa"], where);
    return {
      century: ordinal(r.century, "century", where),
      part: part(r.part, where),
      circa: circa(r.circa, where),
    };
  }
  if (keys.includes("millennium")) {
    const r = record(value, ["millennium", "part", "circa"], where);
    return {
      millennium: ordinal(r.millennium, "millennium", where),
      part: part(r.part, where),
      circa: circa(r.circa, where),
    };
  }
  const r = record(value, ["year", "circa"], where);
  if (typeof r.year !== "number" || !Number.isInteger(r.year)) {
    return fail(where, "year は整数です");
  }
  return { year: r.year, circa: circa(r.circa, where) };
}
```

- `period` の比較を `if (end && bounds(start).from > bounds(end).to) fail(where, "開始が終了より後です");` にする

- [ ] **Step 5:** Run: `pnpm test src/data` — Expected: PASS
- [ ] **Step 6:** Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build` — Expected: すべて成功。typecheck で `.year` を読んでいる箇所（`format.ts`・`layout.ts`・`content.ts`）が落ちたら、Task 2・3 の該当の変更をここで先に行い、そのタスクで重ねて行わない
- [ ] **Step 7:** Commit: `git add src/data && git commit -m "Read century and millennium years"`

---

### Task 2: 世紀単位の期間の文字

**Files:** Modify: `src/app/copy.ts`, `src/timeline/format.ts`, `src/timeline/format.test.ts`

**Interfaces:**
- Consumes: Task 1 の `Year`・`sameYear`
- Produces: `formatYear(value: Year): string`、`formatPeriod(start: Year, end: Year | null): string`（名前と引数は今のまま）

- [ ] **Step 1: テストを書く**（`src/timeline/format.test.ts` に足す）

```ts
describe("formatYear（世紀・千年紀）", () => {
  it.each([
    [{ century: -27, part: null, circa: true }, "前27世紀頃"],
    [{ century: -19, part: "early", circa: false }, "前19世紀初め"],
    [{ century: -17, part: "middle", circa: true }, "前17世紀半ば頃"],
    [{ century: -8, part: "late", circa: false }, "前8世紀末"],
    [{ century: 4, part: null, circa: false }, "4世紀"],
    [{ millennium: -2, part: "second-half", circa: false }, "前2千年紀後半"],
    [{ millennium: -3, part: "first-half", circa: false }, "前3千年紀前半"],
  ] as const)("%o は %s", (value, text) => {
    expect(formatYear(value)).toBe(text);
  });
});

describe("formatPeriod（世紀・千年紀）", () => {
  it("年と世紀をつなぐ", () => {
    expect(
      formatPeriod({ year: -2040, circa: true }, { century: -18, part: null, circa: true }),
    ).toBe("前2040頃–前18世紀頃");
  });

  it("開始と終了が同じ世紀なら 1 つだけ出す", () => {
    const c = { century: -26, part: null, circa: true };
    expect(formatPeriod(c, { ...c })).toBe("前26世紀頃");
  });

  it("同じ世紀でも部分が違えば両方出す", () => {
    expect(
      formatPeriod(
        { century: -6, part: "early", circa: false },
        { century: -6, part: "late", circa: false },
      ),
    ).toBe("前6世紀初め–前6世紀末");
  });
});
```

- [ ] **Step 2:** Run: `pnpm test src/timeline/format.test.ts` — Expected: FAIL

- [ ] **Step 3: 文言を足す**（`src/app/copy.ts` の `present` の前に）

```ts
  circa: "頃",
  before: "前",
  century: "世紀",
  millennium: "千年紀",
  parts: { early: "初め", middle: "半ば", late: "末", "first-half": "前半", "second-half": "後半" },
```

- [ ] **Step 4: `src/timeline/format.ts` を直す**

```ts
// 年の表示形式（spec §5、MVP の spec §6）
import { COPY } from "../app/copy";
import type { Year } from "../data/timeline";
import { sameYear } from "../data/year";

function signed(n: number): string {
  return n < 0 ? `${COPY.before}${-n}` : String(n);
}

export function formatYear(value: Year): string {
  const circa = value.circa ? COPY.circa : "";
  if ("year" in value) return `${signed(value.year)}${circa}`;
  const [n, unit] =
    "century" in value ? [value.century, COPY.century] : [value.millennium, COPY.millennium];
  const part = value.part ? COPY.parts[value.part] : "";
  return `${signed(n)}${unit}${part}${circa}`;
}
```

`formatPeriod` の 1 つにまとめる条件を `if (sameYear(start, end)) return formatYear(start);` にする（`formatPeriodLines` はそのまま）

- [ ] **Step 5:** Run: `pnpm test src/timeline/format.test.ts` — Expected: PASS（既存の `formatYear`・`formatPeriod` のテストも通る）
- [ ] **Step 6:** Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build` — Expected: すべて成功
- [ ] **Step 7:** Commit: `git add src/app/copy.ts src/timeline/format.ts src/timeline/format.test.ts && git commit -m "Format century and millennium years"`

---

### Task 3: 外形・ぼかし・段分けと、幅での並べ替え

**Files:**
- Modify: `src/timeline/layout.ts`, `src/timeline/layout.test.ts`, `src/panel/content.ts`, `src/panel/content.test.ts`

**Interfaces:**
- Consumes: Task 1 の `bounds`
- Produces:
  - `extent(item: { start: Year; end: Year | null }, currentYear: number): { from: number; to: number; solidFrom: number; solidTo: number }`（`endYear` を置き換える。確かな区間がないときは `solidFrom = solidTo = (from + to) / 2`）
  - `BarLayout` に `fadeStart: number`・`fadeEnd: number`（棒の始まり・終わりからぼかす長さ、px）を足す

- [ ] **Step 1: テストを書く**（`src/timeline/layout.test.ts`）

ファイルの先頭のヘルパーの後に足す。

```ts
const c = (century: number) => ({ century, part: null, circa: true });
const rough = (id: string, name: string, start: Year, end: Year | null): Span => ({
  id,
  name,
  start,
  end,
  group: null,
});
```

（`import type { TimelineData, Year } from "../data/timeline";` にする）

`describe("timeRange")` に足す。

```ts
  it("世紀の年は外形（いちばん早い始まりからいちばん遅い終わり）で範囲をとる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [
        {
          id: "a",
          name: "A",
          kind: "regime",
          start: c(-27),
          end: y(-2185),
          sources: [SOURCE],
          notes: [],
        },
      ],
      people: [],
      reigns: [],
    };
    expect(timeRange(data, 2026)).toEqual({ from: -2700, to: -2100 });
  });
```

`describe("layoutLane")` に足す。

```ts
  describe("世紀の端", () => {
    const old = { from: -3000, to: -2000 };

    it("外形の端から確かな区間の端までをぼかす", () => {
      const lane = layoutLane(
        [rough("old", "古王国", c(-27), c(-22))],
        old,
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars[0]).toMatchObject({ offset: 600, length: 1200, fadeStart: 200, fadeEnd: 200 });
    });

    it("年の端はぼかさない", () => {
      const lane = layoutLane(
        [rough("mid", "中王国", y(-2040), c(-18))],
        { from: -2100, to: -1700 },
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars[0]).toMatchObject({ fadeStart: 0, fadeEnd: 200 });
    });

    it("確かな区間がなければ、中ほどをいちばん濃くして両側をぼかす", () => {
      const lane = layoutLane(
        [rough("khufu", "クフ王", c(-26), c(-26))],
        old,
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars[0]).toMatchObject({ offset: 800, length: 200, fadeStart: 100, fadeEnd: 100 });
    });

    it("現在まで続く棒の終わりはぼかさない", () => {
      const lane = layoutLane(
        [rough("now", "ア", c(20), null)],
        { from: 1900, to: 2100 },
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars[0]).toMatchObject({ fadeStart: 200, fadeEnd: 0 });
    });

    it("外形が長くても、確かな区間に収まらなければ棒の中に文字を入れない", () => {
      // 外形は前27〜前26世紀の 400px、確かな区間は 0
      const lane = layoutLane(
        [rough("a", "古王国", c(-27), c(-26))],
        old,
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars[0]?.inside).toBeNull();
      expect(lane.bars[0]?.labelCross).not.toBeNull();
    });

    it("確かな区間に収まれば棒の中に入れる", () => {
      const lane = layoutLane(
        [rough("old", "古王国", c(-27), c(-22))],
        old,
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars[0]?.inside).toBe("stack");
    });

    it("ぼかした部分どうしも重ならないように段を分ける", () => {
      // 前 18 世紀頃に終わる棒と、前 1750 年に始まる棒は外形が重なる
      const lane = layoutLane(
        [rough("a", "ア", y(-2040), c(-18)), rough("b", "イ", y(-1750), y(-1600))],
        { from: -2100, to: -1600 },
        "horizontal",
        measure,
        2026,
      );
      expect(lane.bars.map((bar) => bar.track)).toEqual([0, 1]);
    });
  });
```

既存の `layoutLane` のテストの `toMatchObject` はそのまま通る（年の棒は `fadeStart`・`fadeEnd` が 0）。

`src/panel/content.test.ts` の `describe("panelContent")` に足す。

```ts
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
```

- [ ] **Step 2:** Run: `pnpm test src/timeline/layout.test.ts src/panel/content.test.ts` — Expected: FAIL

- [ ] **Step 3: `src/timeline/layout.ts` を直す**

- `import { bounds } from "../data/year";` を足す
- `endYear` を消し、次を足す

```ts
// 期間の外形（いちばん早い始まりからいちばん遅い終わりまで）と、確かな区間（濃く描く区間）。
// 現在まで続く期間（end が null）は currentYear で終わる。確かな区間がない（開始の幅と終了の幅が
// 重なる）ときは、外形の中ほどの 1 点にする
export function extent(
  item: { start: Year; end: Year | null },
  currentYear: number,
): { from: number; to: number; solidFrom: number; solidTo: number } {
  const start = bounds(item.start);
  const end = item.end ? bounds(item.end) : { from: currentYear, to: currentYear };
  if (start.to <= end.from) {
    return { from: start.from, to: end.to, solidFrom: start.to, solidTo: end.from };
  }
  const middle = (start.from + end.to) / 2;
  return { from: start.from, to: end.to, solidFrom: middle, solidTo: middle };
}
```

- `timeRange` の `years` を `[...data.dynasties, ...data.reigns].flatMap((item) => { const e = extent(item, currentYear); return [e.from, e.to]; })` にする
- `labelRoles` の比較を `bounds(span.start).from < bounds((spans[first] ?? span).start).from` の形にし（`first` が `undefined` のときは今と同じく置き換える）、`layoutLane` の `group` の並べ替えを `.sort((a, b) => bounds(a.start).from - bounds(b.start).from)` にする
- `BarLayout` に次を足す

```ts
  // 棒の始まり・終わりからぼかす長さ（px）。年の端なら 0（spec §4）
  fadeStart: number;
  fadeEnd: number;
```

- `layoutLane` の `periods` を次にする

```ts
  // 開始と終了が同じ年の棒は、長さが 0 にならないよう、その 1 年分の長さを持たせる
  const periods = spans.map((span) => {
    const e = extent(span, currentYear);
    const end = Math.max(e.to, e.from + 1);
    return {
      start: yearToOffset(e.from, range),
      end: yearToOffset(end, range),
      fadeStart: (e.solidFrom - e.from) * PX_PER_YEAR,
      fadeEnd: (e.to - e.solidTo) * PX_PER_YEAR,
    };
  });
  const tracks = assignTracks(periods);
```

- `bars` を作るところで `const { start, end, fadeStart, fadeEnd } = periods[i] ?? { start: 0, end: 0, fadeStart: 0, fadeEnd: 0 };` にし、返すオブジェクトに `fadeStart`・`fadeEnd` を足す
- 棒の中の文字の判断を、確かな区間の長さにする: `bar.inside = bar.periodLines.length === 1 ? insideText(orientation, bar.length - bar.fadeStart - bar.fadeEnd, text) : null;`

- [ ] **Step 4: `src/panel/content.ts` を直す**: `import { bounds } from "../data/year";` を足し、並べ替えを `.sort((a, b) => bounds(a.start).from - bounds(b.start).from)` にする

- [ ] **Step 5:** Run: `pnpm test` — Expected: PASS
- [ ] **Step 6:** Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build` — Expected: すべて成功
- [ ] **Step 7:** Commit: `git add src/timeline src/panel && git commit -m "Lay out bars by their outer range and fade their uncertain ends"`

---

### Task 4: ぼかした棒を描き、主題の名前を変える

**Files:** Modify: `src/timeline/Timeline.tsx`, `src/app/copy.ts`

**Interfaces:**
- Consumes: Task 3 の `BarLayout.fadeStart`・`fadeEnd`

- [ ] **Step 1: 主題の名前を変える**: `src/app/copy.ts` の `subjectRegime: "国家・体制"` を `subjectRegime: "国家・体制など"` にする
- [ ] **Step 2: `Timeline.tsx` にグラデーションを足す**（`barClass` の後）

```tsx
// 幅のある端は、外側で透明になり、確かな区間の端で棒の色になるグラデーションで描く（spec §4）。
// 棒の色の class（bg-bar-a・bg-bar-b）より、ここで指定した背景が優先される
function fadeStyle(index: number, bar: BarLayout, direction: "right" | "bottom"): CSSProperties {
  if (bar.fadeStart === 0 && bar.fadeEnd === 0) return {};
  const color = `var(--color-bar-${index % 2 === 0 ? "a" : "b"})`;
  return {
    background: `linear-gradient(to ${direction}, transparent 0px, ${color} ${bar.fadeStart}px, ${color} calc(100% - ${bar.fadeEnd}px), transparent 100%)`,
  };
}
```

- [ ] **Step 3: 横向きの棒に当てる**: 横向きの棒の `style` に `...fadeStyle(i, bar, "right")` を足し、文字を確かな区間の始まりに寄せるため `paddingLeft: \`calc(${bar.fadeStart}px + var(--spacing-xs))\`` を足す
- [ ] **Step 4: 縦向きの棒に当てる**: 縦向きの棒の `style` に `...fadeStyle(i, bar, "bottom")` を足し、`paddingTop: 1` を `paddingTop: 1 + bar.fadeStart` にする
- [ ] **Step 5:** Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build` — Expected: すべて成功
- [ ] **Step 6: 実ブラウザで確かめる**

`src/data/timeline.json` を一時的に書き換えた版で確かめる（コミットしない）。`cp src/data/timeline.json /tmp/timeline.backup.json` で取っておき、次の行と項目を足した JSON を `src/data/timeline.json` に書く。

```bash
node -e '
const fs = require("node:fs");
const p = "src/data/timeline.json";
const d = JSON.parse(fs.readFileSync(p, "utf8"));
const s = [{ label: "Wikipedia「x」", url: "https://ja.wikipedia.org/wiki/x" }];
const c = (century, part = null) => ({ century, part, circa: true });
d.dynasties.push(
  { id: "t-old", name: "古王国", kind: "regime", start: { year: -2686, circa: true }, end: { year: -2185, circa: true }, sources: s, notes: [] },
  { id: "t-mid", name: "中王国", kind: "regime", start: { year: -2040, circa: true }, end: c(-18), sources: s, notes: [] },
  { id: "t-hit", name: "ヒッタイト", kind: "regime", start: c(-17, "middle"), end: c(-12), sources: s, notes: [] },
);
d.people.push({ id: "t-khufu", name: "クフ王" });
d.reigns.push({ id: "t-khufu", personId: "t-khufu", name: null, role: "monarch", title: "エジプト王", start: c(-26), end: c(-26), sources: s, notes: [] });
d.lanes.unshift({ id: "t-test", name: "テスト", dynasties: ["t-old", "t-mid", "t-hit"], reigns: ["t-khufu"] });
fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
'
```

`pnpm dev` で開き、headless Chromium（`/opt/pw-browsers` の Playwright）で、PC 幅（1280px）と 375px 幅のそれぞれについて、主題 4 つ（国家・体制など／君主／首相・大統領など／政権）と国・地域の表示（テストの行・フランク王国・フランス・イングランド・イギリス）× 向き 2 通りのスクリーンショットを撮って見る。確かめること:

- 主題の選択肢と、国・地域の表示の行の名前が「国家・体制など」になっている
- 中王国の終わり・ヒッタイトの両端・クフ王の両端が、外側に向かって薄くなる（横向きは左右、縦向きは上下）
- 棒の中の文字が、確かな区間の始まりから置かれ、薄い部分に重ならない。クフ王は棒の外にラベルが出る
- 期間の文字が「前2040頃–前18世紀頃」「前17世紀半ば頃–前12世紀」「前26世紀頃」になっている（棒・棒の外のラベル・出典パネル）
- 棒を選ぶと、選択の枠が外形全体に付く
- 既存のフランス・イングランドの表示が変わっていない

確かめたら `cp /tmp/timeline.backup.json src/data/timeline.json` で戻し、`git status` で `src/data/timeline.json` に差分がないことを確かめる。

- [ ] **Step 7:** spec の「状態: レビュー待ち」を「状態: 承認済み」にする
- [ ] **Step 8:** Commit: `git add src/timeline/Timeline.tsx src/app/copy.ts docs && git commit -m "Fade the uncertain ends of bars and rename the regime subject"`

---

### Task 5: PR を作る

- [ ] **Step 1:** `git push -u origin claude/ancient-orient-design`
- [ ] **Step 2:** PR を作る（日本語。本文に、世紀単位の年を足した理由と描き方・主題の名前を変えた理由を spec から短く書き、実ブラウザで確かめたスクリーンショットの要点を書く）。CI が通ってからマージする
