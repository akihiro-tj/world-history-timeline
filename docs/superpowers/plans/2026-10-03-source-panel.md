# 出典パネル 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 年表の棒やラベルを選ぶと、その値の出典（Wikidata と、値に使った Wikipedia の記事）と、Wikidata と違う値や Wikidata にない値の理由が出るパネルを作る。

**Architecture:** 成果物（`timeline.json`）に足されたキーを `parseTimeline` で読む。パネルに出す中身は純粋な関数（`src/panel/content.ts`）で作り、選択の扱い（`src/panel/selection.ts`）と、選んだ棒を見える位置に出すスクロール量（`src/panel/reveal.ts`）も純粋な関数にして Vitest で確かめる。画面は、棒とラベルをボタンにした `Timeline` と、新しい `SourcePanel` を `App` でつなぐ。PC（幅 768px 以上）は右のパネル、スマホは下からのパネル。

**Tech Stack:** React 19、TypeScript、Tailwind CSS 4（DESIGN.md のトークンから `theme.css` を生成）、Vitest（node 環境）、Biome、Vite

**Spec:** `docs/superpowers/specs/2026-10-03-source-panel-design.md`（前提: `docs/superpowers/specs/2026-09-30-grouped-terms-design.md`）

## Global Constraints

- コミットメッセージは英語。UI 文言・コード内コメント・テスト名・ドキュメントは日本語
- `main` に直接コミットしない。ブランチ `claude/data-source-copyright-kzq7za` で作業する
- UI 文言は spec §6 の一覧にあるものだけを `copy.ts` に置く。一覧にない文言を足さない
- 色・角丸・余白・文字はトークンだけを使う。寸法の定数は TS の定数として持つ（`layout.ts` と同じ流儀）
- 影は使わない（DESIGN.md の Elevation & Depth）
- 外部リンクは `target="_blank" rel="noopener noreferrer"`
- 参照の URL は `https://<言語コード>.wikipedia.org/` か `https://www.wikidata.org/` で始まるものだけ（言語コードは英小文字とハイフン）
- 選択は URL に持たせない
- E2E テストは作らない。UI は実ブラウザで PC 幅と 375px 幅の両方、表示 6 通り × 向き 2 通りを確かめる
- 各タスクの終わりに `pnpm exec biome ci .`・`pnpm typecheck`・`pnpm test`・`pnpm build` がすべて通る
- 前提: world-history-timeline-data の計画（`docs/superpowers/plans/2026-10-03-wikidata-sources.md`）が Task 8 まで終わり、新しい形の `src/data/timeline.json` が置かれている

## Review Focus

- 在任が複数あり、そのうち 1 つにだけ注記がある人: 注記は説明している在任の行の下にだけ出て、出典の欄には注記の資料が 1 回だけ並ぶ（Task 3 のテスト）
- 同じ Wikipedia の記事を 2 つの在任の注記が参照している: 出典の欄に同じ URL を 2 回出さない（Task 3 のテスト）
- Wikidata の項目がない王朝（`wikidata: null`）: Wikidata のリンクを出さず、注記の資料だけが出典に並ぶ（Task 3 のテスト）
- 選んだ項目が、表示を切り替えた先にない（君主を選んでから主題を「国家・体制」にする）: パネルが閉じ、何も選ばれていない状態になる（Task 4 のテスト）
- スマホでパネルを開いたとき、選んだ棒がパネルの下に隠れている: 見える上側の範囲まで年表をスクロールする。すでに見えていればスクロールしない（Task 4 の `revealDelta` のテスト）

---

## ファイル構成

- `DESIGN.md`（変更）・`src/app/theme.css`（生成）: 文字の大きさ `title`、パネルの部品
- `src/data/timeline.ts`（変更）・`src/data/timeline.test.ts`（変更）: 新しいキーの型と検証
- `src/data/timeline.json`（データリポから置く）
- `src/timeline/spans.test.ts`・`src/timeline/layout.test.ts`（変更）: テストデータに新しいキーを足すだけ
- `src/panel/selection.ts`（新規）・`selection.test.ts`: 選んだ項目の持ち方と、表示を切り替えたあとに残すか
- `src/panel/reveal.ts`（新規）・`reveal.test.ts`: 選んだ棒を見える範囲に入れるためのスクロール量
- `src/panel/content.ts`（新規）・`content.test.ts`: パネルに出す中身（名前・出典・期間の行・注記）
- `src/panel/SourcePanel.tsx`（新規）: パネルの画面（右・下から）
- `src/app/icons.tsx`（変更）: 外部リンクのアイコン
- `src/app/copy.ts`（変更）: spec §6 の文言
- `src/app/useMediaQuery.ts`（新規）: 幅 768px 以上かどうか
- `src/timeline/Timeline.tsx`（変更）: 棒とラベルをボタンにし、選んだ棒に枠を付け、見える位置までスクロールする
- `src/app/App.tsx`（変更）: 選択の状態とパネルの配置

---

### Task 1: DESIGN.md に文字の大きさとパネルの部品を足す

**Files:**
- Modify: `DESIGN.md`
- Modify: `src/app/theme.css`（`pnpm tokens` で生成）

**Interfaces:**
- Produces: Tailwind のクラス `font-title`・`text-title`（18px、太さ 600、行の高さ 1.4）

- [ ] **Step 1: 依存を入れる**

Run: `pnpm install`
Expected: 終了コード 0

- [ ] **Step 2: front matter にトークンを足す**

`typography:` の `body:` の前に足す。

```yaml
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
```

`components:` の `error-message:` の前に足す。

```yaml
  source-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
  source-panel-title:
    textColor: "{colors.on-surface}"
    typography: "{typography.title}"
  source-panel-heading:
    textColor: "{colors.muted}"
    typography: "{typography.heading}"
  source-link:
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  source-note:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  selected-bar:
    textColor: "{colors.primary}"
```

- [ ] **Step 3: 本文の説明を足す**

`## Colors` の `primary` の行を次にする。

```markdown
- `primary`: 向きの切り替えの選ばれている側のアイコンと下線、キーボードのフォーカスの枠、選んだ棒の枠、出典のリンク
```

`muted` の行を次にする。

```markdown
- `muted`: 年の目盛り、棒の中の期間、棒の外のラベルの引き出し線、出典パネルの節の見出し・地位・注記
```

`## Typography` の箇条を次にする。

```markdown
- `title`: 出典パネルの名前
- `body`: 読み込み中の表示とエラー、出典パネルの期間・地位・リンク
- `label`: 表示のセレクト、出典パネルの注記
- `heading`: 行の名前（主題の表示では国・地域、国・地域の表示では王朝・王）、出典パネルの節の見出し
- `caption`: 棒の名前と期間、棒の外のラベル、年の目盛り。行の高さは `src/timeline/layout.ts` の `LINE_HEIGHT`（16px）で固定する
```

`## Layout` の最後に足す。

```markdown
- 棒か棒の外のラベルを選ぶと出典パネルが開く。幅 768px 以上では年表の右に幅 360px で開き、年表はその分だけ狭くなる。768px 未満では画面の下から高さの約半分（56%）で開き、取っ手を上に引くと全画面に広がる。寸法は `src/panel/SourcePanel.tsx` の定数で持つ
- 出典パネルと年表の区切りは `divider` の線で表す
```

`## Shapes` に足す。

```markdown
- スマホの出典パネルの上の角は `md`
```

`## Components` の最後に足す。

```markdown
- `source-panel`: 出典パネル
- `source-panel-title`: 出典パネルの名前
- `source-panel-heading`: 出典パネルの節の見出し（出典・期間・在位・在任）
- `source-link`: 出典のリンク（新しいタブで開くアイコン付き）
- `source-note`: 期間の下の注記（先頭に「※」）
- `selected-bar`: 選んだ棒の枠
```

- [ ] **Step 4: `theme.css` を作り直す**

Run: `pnpm tokens && grep -n "title" src/app/theme.css`
Expected: `--font-title`・`--text-title: 18px`・`--font-weight-title: 600` が出る

- [ ] **Step 5: 確かめる**

Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
Expected: すべて成功

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md src/app/theme.css
git commit -m "Add design tokens for the source panel"
```

---

### Task 2: 成果物の新しいキーを読む

**Files:**
- Modify: `src/data/timeline.ts`
- Modify: `src/data/timeline.test.ts`
- Modify: `src/timeline/spans.test.ts`, `src/timeline/layout.test.ts`（テストデータにキーを足すだけ）
- Modify: `src/data/timeline.json`（データリポの `pnpm copy` で置いたもの）

**Interfaces:**
- Produces（`src/data/timeline.ts`）:
  - `type Ref = { label: string; url: string }`
  - `type Note = { reason: string; refs: Ref[] }`
  - `Dynasty` に `wikidata: string | null; wikidataLabel: string | null; notes: Note[]`
  - `Person` に `wikidata: string | null; wikidataLabel: string | null`
  - `Reign` に `title: string; notes: Note[]`

- [ ] **Step 1: テストを書く**

`src/data/timeline.test.ts` の `valid()` を次にする。

```ts
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

const note = (url: string, label = "Wikipedia「x」") => ({ reason: "理由の文", refs: [{ label, url }] });
```

`data.people.push({ id: "henry-vii", name: "ヘンリ7世" })` のように人物を足しているテストがあれば、`wikidata: null, wikidataLabel: null` を足す。`describe("parseTimeline", …)` に足す。

```ts
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
    for (const url of ["http://ja.wikipedia.org/wiki/x", "https://example.com/", "javascript:alert(1)"]) {
      const data = valid();
      Object.assign(data.dynasties[0] ?? {}, { notes: [note(url)] });
      expect(() => parseTimeline(data)).toThrow("url は Wikipedia か Wikidata のページです");
    }
  });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `pnpm test src/data/timeline.test.ts`
Expected: FAIL（`知らないキー wikidata があります` など）

- [ ] **Step 3: `src/data/timeline.ts` を直す**

型の部分を次にする（`Year` と `Lane` と `DYNASTY_KINDS`・`ROLES` は今のまま）。

```ts
// 値に使った資料（Wikipedia の記事など）。label は画面に出す名前
export type Ref = { label: string; url: string };
// Wikidata と違う値や Wikidata にない値にした理由。reason は利用者に見える文
export type Note = { reason: string; refs: Ref[] };
// 終わりが null なら現在まで続いている。wikidata は Wikidata の項目の ID、wikidataLabel はその日本語のラベル
export type Dynasty = {
  id: string;
  name: string;
  kind: DynastyKind;
  start: Year;
  end: Year | null;
  wikidata: string | null;
  wikidataLabel: string | null;
  notes: Note[];
};
export type Person = {
  id: string;
  name: string;
  wikidata: string | null;
  wikidataLabel: string | null;
};
// name はその在位のあいだの表示名。null なら人物の名前を出す（即位で名前が変わる人のため）。title は地位
export type Reign = {
  id: string;
  personId: string;
  name: string | null;
  role: Role;
  title: string;
  start: Year;
  end: Year | null;
  notes: Note[];
};
```

`const ID_PATTERN = …` の下に足す。

```ts
const QID_PATTERN = /^Q[1-9][0-9]*$/;
const REF_URL = /^https:\/\/([a-z][a-z-]*\.wikipedia\.org|www\.wikidata\.org)\//;
```

`function name(…)` の下に足す。

```ts
function text(value: unknown, where: string): string {
  if (typeof value !== "string" || value.trim() === "") return fail(where, "文字列が空です");
  return value;
}

// Wikidata の項目の ID と日本語のラベル。項目がなければどちらも null
function wikidataItem(
  r: Record<string, unknown>,
  where: string,
): { wikidata: string | null; wikidataLabel: string | null } {
  if (r.wikidata === null) {
    if (r.wikidataLabel !== null) fail(where, "Wikidata の項目がないのに wikidataLabel があります");
    return { wikidata: null, wikidataLabel: null };
  }
  if (typeof r.wikidata !== "string" || !QID_PATTERN.test(r.wikidata)) {
    return fail(where, "Wikidata の ID が不正です");
  }
  return { wikidata: r.wikidata, wikidataLabel: text(r.wikidataLabel, `${where}.wikidataLabel`) };
}

function notes(value: unknown, where: string): Note[] {
  return array(value, where).map((item, i) => {
    const w = `${where}[${i}]`;
    const r = record(item, ["reason", "refs"], w);
    return {
      reason: text(r.reason, `${w}.reason`),
      refs: array(r.refs, `${w}.refs`).map((ref, j) => {
        const rr = record(ref, ["label", "url"], `${w}.refs[${j}]`);
        if (typeof rr.url !== "string" || !REF_URL.test(rr.url)) {
          return fail(`${w}.refs[${j}]`, "url は Wikipedia か Wikidata のページです");
        }
        return { label: text(rr.label, `${w}.refs[${j}].label`), url: rr.url };
      }),
    };
  });
}
```

`parseTimeline` の 3 か所を直す。

```ts
    const r = record(
      item,
      ["id", "name", "kind", "start", "end", "wikidata", "wikidataLabel", "notes"],
      where,
    );
    return {
      id: id(r.id, where),
      name: name(r.name, where),
      kind: dynastyKind(r.kind, where),
      ...period(r, where),
      ...wikidataItem(r, where),
      notes: notes(r.notes, `${where}.notes`),
    };
```

```ts
    const r = record(item, ["id", "name", "wikidata", "wikidataLabel"], where);
    return { id: id(r.id, where), name: name(r.name, where), ...wikidataItem(r, where) };
```

```ts
    const r = record(
      item,
      ["id", "personId", "name", "role", "title", "start", "end", "notes"],
      where,
    );
    const personId = id(r.personId, where);
    if (!personMap.has(personId)) fail(where, `存在しない人物を参照しています: ${personId}`);
    return {
      id: id(r.id, where),
      personId,
      name: r.name === null ? null : name(r.name, where),
      role: role(r.role, where),
      title: text(r.title, `${where}.title`),
      ...period(r, where),
      notes: notes(r.notes, `${where}.notes`),
    };
```

- [ ] **Step 4: ほかのテストのデータにキーを足す**

`src/timeline/spans.test.ts` と `src/timeline/layout.test.ts` の `TimelineData` のテストデータで、王朝の各要素に `wikidata: null, wikidataLabel: null, notes: []`、人物の各要素に `wikidata: null, wikidataLabel: null`、在位の各要素に `title: "地位", notes: []` を足す（値は使わないので何でもよい）。

- [ ] **Step 5: 新しい形の `timeline.json` を置く**

world-history-timeline-data で `pnpm build && pnpm copy ../world-history-timeline` を実行した結果が `src/data/timeline.json` に入っていることを確かめる。

Run: `node -e 'const d=require("./src/data/timeline.json"); console.log(d.dynasties.every(x=>"wikidata" in x && "notes" in x), d.reigns.every(x=>"title" in x))'`
Expected: `true true`

- [ ] **Step 6: 確かめる**

Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
Expected: すべて成功

Run: `pnpm exec tsx --eval "import { readFileSync } from 'node:fs'; import { parseTimeline } from './src/data/timeline.ts'; parseTimeline(JSON.parse(readFileSync('src/data/timeline.json', 'utf8'))); console.log('ok')"`
Expected: `ok`（本物のデータが検証を通る）

- [ ] **Step 7: Commit**

```bash
git add src/data src/timeline/spans.test.ts src/timeline/layout.test.ts
git commit -m "Read Wikidata items, notes and titles from the timeline data"
```

---

### Task 3: パネルに出す中身を作る関数

**Files:**
- Create: `src/panel/content.ts`
- Create: `src/panel/content.test.ts`
- Modify: `src/app/copy.ts`

**Interfaces:**
- Consumes: Task 2 の `TimelineData`, `Year`；Task 4 の `Selection`（型だけ。Task 4 より先に作るので、ここで `src/panel/selection.ts` に型だけを置く）
- Produces（`src/panel/content.ts`）:
  - `type PanelSection = "period" | "monarch" | "leader"`
  - `type PanelLink = { label: string; url: string }`
  - `type PanelRow = { id: string; start: Year; end: Year | null; title: string | null; notes: string[] }`
  - `type PanelContent = { name: string; section: PanelSection; links: PanelLink[]; rows: PanelRow[] }`
  - `function panelContent(data: TimelineData, selection: Selection): PanelContent | null`
- Produces（`src/panel/selection.ts`、型だけ）: `type Selection = { laneId: string; key: string }`

- [ ] **Step 1: 文言を足す**

`src/app/copy.ts` の `COPY` の最後（`loadError` の次）に足す。

```ts
  panelLabel: "出典",
  sectionSources: "出典",
  sectionPeriod: "期間",
  sectionMonarch: "在位",
  sectionLeader: "在任",
  noteMark: "※",
  close: "閉じる",
  newTab: "（新しいタブで開きます）",
  wikidataLink: (label: string) => `Wikidata「${label}」`,
```

- [ ] **Step 2: 選択の型を置く**

`src/panel/selection.ts`:

```ts
// 選んだ項目。laneId は行の国・地域、key は王朝なら "dynasty:<id>"、在位なら "reign:<人物の id>/<表示名>"
// （再登板の spec のまとまり。同じ行の、同じ人物・同じ表示名の在位）
export type Selection = { laneId: string; key: string };
```

- [ ] **Step 3: テストを書く**

`src/panel/content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { panelContent } from "./content";

const y = (year: number) => ({ year, circa: false });
const wp = (title: string) => ({ label: `Wikipedia「${title}」`, url: `https://ja.wikipedia.org/wiki/${title}` });

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
    { id: "napoleon", name: "ナポレオン1世", wikidata: "Q3", wikidataLabel: "ナポレオン・ボナパルト" },
  ],
  reigns: [
    { id: "poincare-1926", personId: "poincare", name: null, role: "leader", title: "首相", start: y(1926), end: y(1929), notes: [{ reason: "B", refs: [wp("ポワンカレ")] }] },
    { id: "poincare-1912", personId: "poincare", name: null, role: "leader", title: "首相", start: y(1912), end: y(1913), notes: [] },
    { id: "poincare-1913", personId: "poincare", name: null, role: "leader", title: "大統領", start: y(1913), end: y(1920), notes: [{ reason: "A", refs: [wp("ポワンカレ"), wp("第三共和政")] }] },
    { id: "napoleon-1799", personId: "napoleon", name: "ナポレオン=ボナパルト", role: "leader", title: "第一統領", start: y(1799), end: y(1804), notes: [] },
    { id: "napoleon-1804", personId: "napoleon", name: null, role: "monarch", title: "フランス皇帝", start: y(1804), end: y(1814), notes: [] },
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
      rows: [{ id: "stuart-like", start: y(1603), end: y(1649), title: null, notes: ["期間の理由"] }],
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
    const consul = panelContent(data, { laneId: "france", key: "reign:napoleon/ナポレオン=ボナパルト" });
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
```

- [ ] **Step 4: 失敗を確かめる**

Run: `pnpm test src/panel/content.test.ts`
Expected: FAIL（`./content` がない）

- [ ] **Step 5: `src/panel/content.ts` を書く**

```ts
// 出典パネルに出す中身（名前・出典のリンク・期間の行・注記）を作る（spec §5）
import { COPY } from "../app/copy";
import type { Note, Person, TimelineData, Year } from "../data/timeline";
import type { Selection } from "./selection";

// 節の見出し: 王朝は「期間」、君主は「在位」、首相・大統領などは「在任」
export type PanelSection = "period" | "monarch" | "leader";
export type PanelLink = { label: string; url: string };
export type PanelRow = { id: string; start: Year; end: Year | null; title: string | null; notes: string[] };
export type PanelContent = { name: string; section: PanelSection; links: PanelLink[]; rows: PanelRow[] };

const WIKIDATA_ITEM = "https://www.wikidata.org/wiki/";

// Wikidata のリンクを先に、続けて注記の資料を行の順に集める。同じ URL は 1 つにする
function links(item: Pick<Person, "wikidata" | "wikidataLabel">, notes: Note[]): PanelLink[] {
  const result: PanelLink[] = [];
  if (item.wikidata !== null && item.wikidataLabel !== null) {
    result.push({ label: COPY.wikidataLink(item.wikidataLabel), url: WIKIDATA_ITEM + item.wikidata });
  }
  for (const ref of notes.flatMap((note) => note.refs)) {
    if (!result.some((link) => link.url === ref.url)) result.push(ref);
  }
  return result;
}

export function panelContent(data: TimelineData, selection: Selection): PanelContent | null {
  const lane = data.lanes.find((candidate) => candidate.id === selection.laneId);
  if (!lane) return null;

  if (selection.key.startsWith("dynasty:")) {
    const id = selection.key.slice("dynasty:".length);
    const dynasty = lane.dynasties.includes(id) ? data.dynasties.find((d) => d.id === id) : undefined;
    if (!dynasty) return null;
    return {
      name: dynasty.name,
      section: "period",
      links: links(dynasty, dynasty.notes),
      rows: [
        {
          id: dynasty.id,
          start: dynasty.start,
          end: dynasty.end,
          title: null,
          notes: dynasty.notes.map((note) => note.reason),
        },
      ],
    };
  }

  const group = selection.key.slice("reign:".length);
  const reigns = lane.reigns
    .map((id) => data.reigns.find((reign) => reign.id === id))
    .filter((reign) => reign !== undefined)
    .filter((reign) => {
      const person = data.people.find((p) => p.id === reign.personId);
      return person !== undefined && `${reign.personId}/${reign.name ?? person.name}` === group;
    })
    .sort((a, b) => a.start.year - b.start.year);
  const first = reigns[0];
  const person = first && data.people.find((p) => p.id === first.personId);
  if (!first || !person) return null;
  return {
    name: first.name ?? person.name,
    section: first.role,
    links: links(person, reigns.flatMap((reign) => reign.notes)),
    rows: reigns.map((reign) => ({
      id: reign.id,
      start: reign.start,
      end: reign.end,
      title: reign.title,
      notes: reign.notes.map((note) => note.reason),
    })),
  };
}
```

- [ ] **Step 6: 通ることを確かめる**

Run: `pnpm format && pnpm test src/panel/content.test.ts`
Expected: PASS

- [ ] **Step 7: 全体を確かめて Commit**

Run: `pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
Expected: すべて成功

```bash
git add src/panel src/app/copy.ts
git commit -m "Build the source panel content from the timeline data"
```

---

### Task 4: 選択の扱いと、選んだ棒を見える位置に出すスクロール量

**Files:**
- Modify: `src/panel/selection.ts`
- Create: `src/panel/selection.test.ts`
- Create: `src/panel/reveal.ts`
- Create: `src/panel/reveal.test.ts`

**Interfaces:**
- Consumes: `Span`, `Row`, `View`（`src/timeline/spans.ts`）
- Produces:
  - `function spanKey(span: Span): string`（王朝 `dynasty:<id>`、在位 `reign:<group>`）
  - `function laneIdOf(view: View, row: Row): string`
  - `function isSelected(selection: Selection | null, laneId: string, span: Span): boolean`
  - `function keepSelection(selection: Selection | null, view: View, rows: Row[]): Selection | null`
  - `function revealDelta(itemStart: number, itemEnd: number, areaStart: number, areaEnd: number): number`

- [ ] **Step 1: テストを書く**

`src/panel/selection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Row, Span, View } from "../timeline/spans";
import { isSelected, keepSelection, laneIdOf, spanKey } from "./selection";

const y = (year: number) => ({ year, circa: false });
const dynasty: Span = { id: "tudor", name: "テューダー朝", start: y(1485), end: y(1603), group: null };
const reign: Span = { id: "pitt-1783", name: "ピット", start: y(1783), end: y(1801), group: "pitt/ピット" };
const rows: Row[] = [{ id: "england", name: "イングランド", spans: [dynasty, reign] }];
const subject: View = { kind: "subject", subject: "regime" };
const lane: View = { kind: "lane", laneId: "england" };

describe("選択", () => {
  it("棒から選択の key を作る", () => {
    expect(spanKey(dynasty)).toBe("dynasty:tudor");
    expect(spanKey(reign)).toBe("reign:pitt/ピット");
  });

  it("主題の表示では行が国・地域、国・地域の表示では選んだ国・地域", () => {
    expect(laneIdOf(subject, { id: "france", name: "", spans: [] })).toBe("france");
    expect(laneIdOf(lane, { id: "monarch", name: "", spans: [] })).toBe("england");
  });

  it("同じ行の同じまとまりの棒を選んだものとする", () => {
    const selection = { laneId: "england", key: "reign:pitt/ピット" };
    expect(isSelected(selection, "england", reign)).toBe(true);
    expect(isSelected(selection, "england", { ...reign, id: "pitt-1804" })).toBe(true);
    expect(isSelected(selection, "france", reign)).toBe(false);
    expect(isSelected(selection, "england", dynasty)).toBe(false);
    expect(isSelected(null, "england", dynasty)).toBe(false);
  });

  it("表示を切り替えた先に選んだ項目があれば残し、なければ外す", () => {
    const selection = { laneId: "england", key: "dynasty:tudor" };
    expect(keepSelection(selection, subject, rows)).toEqual(selection);
    expect(keepSelection(selection, lane, [{ id: "regime", name: "", spans: [dynasty] }])).toEqual(selection);
    expect(keepSelection(selection, subject, [{ id: "england", name: "", spans: [reign] }])).toBeNull();
    expect(keepSelection(null, subject, rows)).toBeNull();
  });
});
```

`src/panel/reveal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { revealDelta } from "./reveal";

describe("revealDelta", () => {
  it("見えていればスクロールしない", () => {
    expect(revealDelta(100, 150, 0, 400)).toBe(0);
  });

  it("見える範囲より後ろにあれば、終わりがそろうまで進める", () => {
    expect(revealDelta(500, 560, 0, 400)).toBe(160 + 8);
  });

  it("見える範囲より前にあれば、始まりがそろうまで戻す", () => {
    expect(revealDelta(-100, -40, 0, 400)).toBe(-100 - 8);
  });

  it("見える範囲より大きければ始まりにそろえる", () => {
    expect(revealDelta(300, 900, 0, 400)).toBe(300 - 8);
  });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `pnpm test src/panel`
Expected: FAIL

- [ ] **Step 3: `src/panel/selection.ts` を書く**

```ts
// 選んだ項目の持ち方。URL には持たせず、アプリの中の状態にする（spec §4）
import type { Row, Span, View } from "../timeline/spans";

// 選んだ項目。laneId は行の国・地域、key は王朝なら "dynasty:<id>"、在位なら "reign:<人物の id>/<表示名>"
// （再登板の spec のまとまり。同じ行の、同じ人物・同じ表示名の在位）
export type Selection = { laneId: string; key: string };

// 王朝の棒は group が null、在位の棒は group が "<人物の id>/<表示名>"（spans.ts）
export function spanKey(span: Span): string {
  return span.group === null ? `dynasty:${span.id}` : `reign:${span.group}`;
}

// 主題の表示では行が国・地域、国・地域の表示では行が主題なので、選んでいる国・地域を使う
export function laneIdOf(view: View, row: Row): string {
  return view.kind === "subject" ? row.id : view.laneId;
}

export function isSelected(selection: Selection | null, laneId: string, span: Span): boolean {
  return selection !== null && selection.laneId === laneId && selection.key === spanKey(span);
}

// 表示を切り替えた先に選んだ項目があれば選んだままにし、なければ外す
export function keepSelection(selection: Selection | null, view: View, rows: Row[]): Selection | null {
  if (selection === null) return null;
  const found = rows.some((row) => row.spans.some((span) => isSelected(selection, laneIdOf(view, row), span)));
  return found ? selection : null;
}
```

- [ ] **Step 4: `src/panel/reveal.ts` を書く**

```ts
// 選んだ棒を見える範囲に入れるためのスクロール量（正なら進める、負なら戻す、0 なら動かさない）
// 端にぴったり付けず、少し余白を残す
export const REVEAL_MARGIN = 8;

export function revealDelta(itemStart: number, itemEnd: number, areaStart: number, areaEnd: number): number {
  if (itemStart >= areaStart && itemEnd <= areaEnd) return 0;
  if (itemEnd - itemStart > areaEnd - areaStart || itemStart < areaStart) {
    return itemStart - areaStart - REVEAL_MARGIN;
  }
  return itemEnd - areaEnd + REVEAL_MARGIN;
}
```

- [ ] **Step 5: 通ることを確かめて Commit**

Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
Expected: すべて成功

```bash
git add src/panel
git commit -m "Keep the selection across views and compute how far to scroll to it"
```

---

### Task 5: 棒とラベルを選べるようにする

**Files:**
- Modify: `src/timeline/Timeline.tsx`

**Interfaces:**
- Consumes: Task 4 の `revealDelta`
- Produces（`Timeline` の props に足す）:
  - `isSelected: (row: Row, span: Span) => boolean`
  - `onSelect: (row: Row, span: Span, element: HTMLElement) => void`
  - `revealKey: string | null`（選んだ項目が変わったら変わる値。変わったら選んだ棒を見える位置までスクロールする）
  - `visibleRatio: number`（年表のうち見えている割合。PC は 1、スマホでパネルを開いているときは 0.44）

- [ ] **Step 1: props を足す**

`type Props` に足す。

```ts
  // 棒を選んでいるか、選んだときに呼ぶ関数（element は選んだボタン。閉じたときにフォーカスを戻す）
  isSelected: (row: Row, span: Span) => boolean;
  onSelect: (row: Row, span: Span, element: HTMLElement) => void;
  // 選んだ項目が変わると変わる値。変わったら、選んだ棒を見える位置までスクロールする
  revealKey: string | null;
  // 年表のうち見えている割合（上から）。スマホで下からパネルが開いているときは上側だけが見える
  visibleRatio: number;
```

`import` に `import { revealDelta } from "../panel/reveal";` を足す。

`Timeline` の引数を `{ rows, range, orientation, currentYear, isSelected, onSelect, revealKey, visibleRatio }` にし、`<Horizontal …/>` と `<Vertical …/>` に `isSelected={isSelected} onSelect={onSelect}` を渡す。

- [ ] **Step 2: 選んだ棒を見える位置までスクロールする**

`Timeline` の中の、中央の年に合わせ直す `useLayoutEffect` の後ろに足す。

```ts
  // 選んだ棒が見えていなければ、見える位置までスクロールする（パネルが開いた後の大きさで測る）
  useEffect(() => {
    const scroller = scrollerRef.current;
    // 全画面に広げたパネルの下では年表が見えないので、スクロールしない
    if (!scroller || revealKey === null || visibleRatio <= 0) return;
    const target = scroller.querySelector<HTMLElement>('[data-selected="true"]');
    if (!target) return;
    const area = scroller.getBoundingClientRect();
    const item = target.getBoundingClientRect();
    // 貼り付けた見出し（縦向きの行の見出し・横向きの年の目盛り）の下から測る
    const top = area.top + (orientation === "vertical" ? HEADER_HEIGHT : AXIS_HEIGHT);
    const bottom = area.top + area.height * visibleRatio;
    const left = area.left + (orientation === "vertical" ? AXIS_WIDTH : 0);
    scroller.scrollBy({
      top: revealDelta(item.top, item.bottom, top, bottom),
      left: revealDelta(item.left, item.right, left, area.right),
    });
  }, [revealKey, visibleRatio, orientation]);
```

`import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef } from "react";` にする。

- [ ] **Step 3: 棒とラベルをボタンにする**

共通のクラスと属性を足す（`barClass` の下）。

```ts
// 選んだ棒の枠とキーボードのフォーカスの枠は primary の 2px（spec §4）
const selectableClass =
  "cursor-pointer text-left data-[selected=true]:outline-2 data-[selected=true]:outline-offset-1 data-[selected=true]:outline-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

type SelectProps = {
  isSelected: (row: Row, span: Span) => boolean;
  onSelect: (row: Row, span: Span, element: HTMLElement) => void;
};
```

`OutsideLabel` の外側の `<div>` を `<button>` にし、props に `row`・`selected`・`onSelect` を足す。

```tsx
function OutsideLabel({
  bar,
  className,
  style,
  selected,
  onSelect,
}: {
  bar: BarLayout;
  className: string;
  style: CSSProperties;
  selected: boolean;
  onSelect: (element: HTMLElement) => void;
}) {
  return (
    // 同じ項目の棒がキーボードで選べるので、ラベルは Tab の順に入れない
    <button
      type="button"
      tabIndex={-1}
      data-selected={selected}
      onClick={(event) => onSelect(event.currentTarget)}
      className={`absolute whitespace-nowrap border-muted font-caption text-caption text-on-surface ${selectableClass} ${className}`}
      style={{ ...textStyle, ...style }}
    >
      <div>{bar.span.name}</div>
      {bar.periodLines.map((line) => (
        <div key={line} className="text-muted">
          {line}
        </div>
      ))}
    </button>
  );
}
```

`Horizontal` と `Vertical` の引数に `isSelected, onSelect` を足し（型は `{ range: TimeRange; lanes: LaneEntry[] } & SelectProps`）、棒の `<div key={bar.span.id} className={…}>` を `<button>` にする。横向きは次のとおり（縦向きも同じ属性を足し、`className` に `selectableClass` を足す）。

```tsx
              <button
                type="button"
                key={bar.span.id}
                data-selected={isSelected(lane, bar.span)}
                aria-expanded={isSelected(lane, bar.span)}
                aria-label={`${bar.span.name} ${bar.periodLines.join("")}`}
                onClick={(event) => onSelect(lane, bar.span, event.currentTarget)}
                className={`${barClass(i)} ${selectableClass} block px-xs font-caption text-caption`}
                style={{ …今のまま… }}
              >
```

`OutsideLabel` を使っている 2 か所に `selected={isSelected(lane, bar.span)}` と `onSelect={(element) => onSelect(lane, bar.span, element)}` を足す。

- [ ] **Step 4: 確かめる**

Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck`
Expected: `App.tsx` で `Timeline` の props が足りないエラーが出る（Task 6 で直す）。ほかのエラーがないこと

- [ ] **Step 5: Commit はしない**

`App.tsx` を直すまで型が通らないので、Task 6 と一緒にコミットする。

---

### Task 6: 出典パネルを作り、App につなぐ

**Files:**
- Create: `src/panel/SourcePanel.tsx`
- Create: `src/app/useMediaQuery.ts`
- Modify: `src/app/icons.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: Task 3 の `panelContent`, `PanelContent`；Task 4 の `Selection`, `spanKey`, `laneIdOf`, `isSelected`, `keepSelection`；Task 5 の `Timeline` の props；`formatPeriod`
- Produces:
  - `SourcePanel` の props: `{ content: PanelContent; layout: "side" | "sheet"; onClose: () => void; expanded: boolean; onExpandedChange: (expanded: boolean) => void }`
  - `useMediaQuery(query: string): boolean`
  - `ExternalLinkIcon`
  - 定数 `PANEL_WIDTH = 360`, `SHEET_HEIGHT_RATIO = 0.56`, `WIDE_QUERY = "(min-width: 768px)"`

- [ ] **Step 1: 外部リンクのアイコンを足す**

`src/app/icons.tsx` の最後に足す。

```tsx
// 外部リンク（新しいタブで開く）の印。四角から右上に矢印が出る形
export function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="ml-xs inline size-3.5 align-[-2px]"
    >
      <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5V13a.5.5 0 0 1-.5.5h-8.5A.5.5 0 0 1 2.5 13V4.5A.5.5 0 0 1 3 4H6.5" />
    </svg>
  );
}
```

- [ ] **Step 2: 幅を見るフックを書く**

`src/app/useMediaQuery.ts`:

```ts
// メディアクエリに当てはまるかを返し、変わったら描き直す
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
```

- [ ] **Step 3: `src/panel/SourcePanel.tsx` を書く**

```tsx
// 出典パネル（spec §5）。PC は年表の右、スマホは画面の下から出す。モーダルにはせず、年表は操作できるままにする
import { useEffect, useRef } from "react";
import { COPY } from "../app/copy";
import { ExternalLinkIcon } from "../app/icons";
import { formatPeriod } from "../timeline/format";
import type { PanelContent, PanelSection } from "./content";

export const PANEL_WIDTH = 360;
export const SHEET_HEIGHT_RATIO = 0.56;
// 取っ手をこれ以上動かしたら、広げる・閉じるとみなす（px）
const DRAG_THRESHOLD = 32;

const SECTION_LABELS: Record<PanelSection, string> = {
  period: COPY.sectionPeriod,
  monarch: COPY.sectionMonarch,
  leader: COPY.sectionLeader,
};

type Props = {
  content: PanelContent;
  layout: "side" | "sheet";
  onClose: () => void;
  // スマホで全画面に広げているか
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function SourcePanel({ content, layout, onClose, expanded, onExpandedChange }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dragStart = useRef<number | null>(null);

  // 開いたとき（中身が変わったとき）にパネルの名前へフォーカスを移す
  useEffect(() => {
    titleRef.current?.focus();
  }, [content]);

  // Esc で閉じる
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const placement =
    layout === "side"
      ? "shrink-0 border-l border-border"
      : "absolute inset-x-0 bottom-0 z-40 rounded-t-md border-t border-border";
  const size =
    layout === "side"
      ? { width: PANEL_WIDTH }
      : { height: expanded ? "100%" : `${SHEET_HEIGHT_RATIO * 100}%` };

  return (
    <aside
      aria-label={COPY.panelLabel}
      className={`flex min-h-0 flex-col bg-surface font-body text-body text-on-surface ${placement}`}
      style={size}
    >
      {layout === "sheet" && (
        // 取っ手: 上に引くと全画面、下に引くと（全画面なら元の高さに、そうでなければ）閉じる。押すと切り替える
        <div
          aria-hidden="true"
          className="flex shrink-0 cursor-grab touch-none justify-center pt-sm"
          onPointerDown={(event) => {
            dragStart.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = dragStart.current;
            dragStart.current = null;
            if (start === null) return;
            const moved = event.clientY - start;
            if (moved < -DRAG_THRESHOLD) onExpandedChange(true);
            else if (moved > DRAG_THRESHOLD) {
              if (expanded) onExpandedChange(false);
              else onClose();
            } else onExpandedChange(!expanded);
          }}
        >
          <span className="h-xs w-10 rounded-sm bg-border" />
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between gap-sm pt-sm pl-md">
        <h2 ref={titleRef} tabIndex={-1} className="font-title text-title outline-none">
          {content.name}
        </h2>
        <button
          type="button"
          aria-label={COPY.close}
          onClick={onClose}
          className="inline-flex min-h-tap min-w-tap items-center justify-center text-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          ×
        </button>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-md overflow-y-auto px-md pt-xs pb-md">
        {content.links.length > 0 && (
          <section>
            <h3 className="mb-xs font-heading text-heading text-muted">{COPY.sectionSources}</h3>
            <ul className="grid gap-xs">
              {content.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {link.label}
                    <ExternalLinkIcon />
                    <span className="sr-only">{COPY.newTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3 className="mb-xs font-heading text-heading text-muted">{SECTION_LABELS[content.section]}</h3>
          <ul>
            {content.rows.map((row) => (
              <li key={row.id} className="border-b border-grid py-sm last:border-b-0">
                <div className="flex justify-between gap-sm tabular-nums">
                  <span>{formatPeriod(row.start, row.end)}</span>
                  {row.title !== null && <span className="text-muted">{row.title}</span>}
                </div>
                {row.notes.map((note) => (
                  <p key={note} className="mt-xs grid grid-cols-[auto_1fr] font-label text-label text-muted">
                    <span aria-hidden="true">{COPY.noteMark}</span>
                    <span>{note}</span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: `App.tsx` につなぐ**

import を足す。

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { panelContent } from "../panel/content";
import { isSelected, keepSelection, laneIdOf, type Selection, spanKey } from "../panel/selection";
import { SHEET_HEIGHT_RATIO, SourcePanel } from "../panel/SourcePanel";
import type { Row, Span } from "../timeline/spans";
import { useMediaQuery } from "./useMediaQuery";
```

`App` の中、`const rows = useMemo(…)` の後ろに足す。

```ts
  // 幅 768px 以上は右にパネル、未満は下からパネル（spec §5）
  const wide = useMediaQuery("(min-width: 768px)");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState(false);
  // 閉じたときにフォーカスを戻す、選んだ棒のボタン
  const trigger = useRef<HTMLElement | null>(null);

  // 表示を切り替えた先に選んだ項目がなければ閉じる
  useEffect(() => {
    if (rows) setSelection((current) => keepSelection(current, view, rows));
  }, [rows, view]);

  const content = useMemo(
    () => (data && selection ? panelContent(data, selection) : null),
    [data, selection],
  );

  const handleSelect = useCallback(
    (row: Row, span: Span, element: HTMLElement) => {
      trigger.current = element;
      setSelection({ laneId: laneIdOf(view, row), key: spanKey(span) });
    },
    [view],
  );

  const handleClose = useCallback(() => {
    setSelection(null);
    setExpanded(false);
    if (trigger.current?.isConnected) trigger.current.focus();
  }, []);

  const selected = useCallback(
    (row: Row, span: Span) => isSelected(selection, laneIdOf(view, row), span),
    [selection, view],
  );
```

`<main className="min-h-0 flex-1">` を次にする（中の読み込み中・エラーの表示は今のまま）。

```tsx
      <main className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {state.status === "loading" && <p className="p-md text-muted">{COPY.loading}</p>}
          {state.status === "error" && (
            <p role="alert" className="m-md rounded-sm bg-error-surface p-sm text-on-error-surface">
              {COPY.loadError}
            </p>
          )}
          {rows && (
            <Timeline
              rows={rows}
              range={range}
              orientation={orientation}
              currentYear={currentYear}
              isSelected={selected}
              onSelect={handleSelect}
              revealKey={selection ? `${selection.laneId}|${selection.key}` : null}
              visibleRatio={wide || !content ? 1 : expanded ? 0 : 1 - SHEET_HEIGHT_RATIO}
            />
          )}
        </div>
        {content && (
          <SourcePanel
            content={content}
            layout={wide ? "side" : "sheet"}
            onClose={handleClose}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
        )}
      </main>
```

- [ ] **Step 5: 確かめる**

Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
Expected: すべて成功

- [ ] **Step 6: Commit**

```bash
git add src/timeline/Timeline.tsx src/panel/SourcePanel.tsx src/app/useMediaQuery.ts src/app/icons.tsx src/app/App.tsx
git commit -m "Open a source panel when a bar or label is selected"
```

---

### Task 7: 実ブラウザで確かめる

**Files:** 確かめた結果、直すところがあれば該当のファイル（このタスクで新しいテストファイルは作らない。確かめるスクリプトはコミットしない）

- [ ] **Step 1: 開発サーバーを起動する**

Run（バックグラウンド）: `pnpm dev --port 5173`

- [ ] **Step 2: 表示 6 通り × 向き 2 通り × 幅 2 通りで、パネルを開いた状態を撮る**

作業用のディレクトリ（コミットしない）に Playwright のスクリプトを置いて実行する。Chromium は `/opt/pw-browsers/chromium` を使う。各組み合わせで、最初の行の 3 本目の棒（なければ最初の棒）を押してパネルを開き、スクリーンショットを撮り、次を数値で確かめる。

```js
// check-panel.mjs（コミットしない）
import { chromium } from "playwright";
const views = ["subject:regime", "subject:monarch", "subject:leader", "subject:government", "lane:france", "lane:england"];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const width of [1280, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  await page.goto("http://localhost:5173/");
  for (const view of views) {
    for (const orientation of ["縦", "横"]) {
      await page.selectOption("select", view);
      await page.click(`button[aria-label="${orientation}"]`);
      const bars = await page.$$("button[aria-expanded]");
      await (bars[2] ?? bars[0]).click();
      await page.waitForSelector('aside[aria-label="出典"]');
      const result = await page.evaluate(() => {
        const panel = document.querySelector('aside[aria-label="出典"]').getBoundingClientRect();
        const sel = document.querySelector('[data-selected="true"]').getBoundingClientRect();
        const overlap = !(sel.right <= panel.left || sel.left >= panel.right || sel.bottom <= panel.top || sel.top >= panel.bottom);
        const notes = [...document.querySelectorAll("aside p")].every((p) => p.scrollWidth <= p.clientWidth + 1);
        return { overlap, notes };
      });
      console.log(width, view, orientation, JSON.stringify(result));
      await page.screenshot({ path: `shot-${width}-${view.replace(":", "-")}-${orientation}.png` });
      await page.keyboard.press("Escape");
    }
  }
  await page.close();
}
await browser.close();
```

Expected: すべての行で `overlap` が `false`（選んだ棒がパネルに隠れていない）、`notes` が `true`（注記がパネルからはみ出していない）。スクリーンショットを見て、棒・ラベル・行の見出しの位置がパネルを開く前と変わっていないこと、ラベルどうしが重なっていないことを確かめる（パネルを開く前のスクリーンショットも同じ組み合わせで撮って並べる）

- [ ] **Step 3: 操作を確かめる**

PC 幅で: Tab で棒に移り Enter でパネルが開く、Esc で閉じてフォーカスが同じ棒に戻る、別の棒を押すとパネルの中身が入れ替わる。375px 幅で: 取っ手を上に 100px 引くとパネルが全画面になり、下に 100px 引くと元の高さに戻り、もう一度下に引くと閉じる。ポワンカレなど在任が複数ある人で、その行の棒すべてに枠が付き、パネルに在任が地位と並ぶこと。注記がある項目（ステュアート朝など）で、期間の下に「※」付きの注記が出て、出典に Wikipedia の記事が並ぶこと。

- [ ] **Step 4: 直したところがあれば確かめて Commit**

Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
Expected: すべて成功

```bash
git add -A src DESIGN.md
git commit -m "Fix source panel layout found in browser checks"
```

（直すところがなければコミットしない）
