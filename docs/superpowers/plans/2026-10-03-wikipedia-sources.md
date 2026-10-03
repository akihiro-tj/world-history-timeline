# 出典パネルを Wikipedia の出典に合わせる 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ブランチにある出典パネル（`2026-10-03-source-panel.md` の Task 1〜7）を、改めた spec（出典は Wikipedia の記事、注記は文、期間のあとに出典）に合わせる。

**Architecture:** 成果物の型と検証（`timeline.ts`）を `sources`・`notes: string[]` にし、人物を `{ id, name }` に戻す。パネルの中身（`content.ts`）は出典を `sources` から集める。パネル（`SourcePanel.tsx`）は期間の節を先に、出典の節を後に置く。データ（`timeline.json`）は data リポの置き換えが承認されてから入れ替える。

**Tech Stack:** React 19、TypeScript、Tailwind CSS 4、Vitest（node 環境）、Biome、Vite

**Spec:** `docs/superpowers/specs/2026-10-03-source-panel-design.md`

## Global Constraints

- コミットメッセージは英語。UI 文言・コード内コメント・テスト名・ドキュメントは日本語
- ブランチ `claude/data-source-copyright-kzq7za` で作業する
- UI 文言は spec §6 のものだけを使う
- 各タスクの終わりに `pnpm exec biome ci .`・`pnpm typecheck`・`pnpm test`・`pnpm build` がすべて通る

## Review Focus

- 出典の URL の規則: 言語コード付きの Wikipedia は通し、Wikidata やほかのサイト・http は弾く（Task 1 のテスト）
- 在位のまとまりの出典: 在位の年の順に集め、同じ URL は 1 つにする（Task 2 のテスト）
- 中身の順: 名前 → 期間・在位・在任 → 出典（Task 3、実ブラウザ）

---

### Task 1: 成果物の型と検証を `sources`・`notes`（文）にする

**Files:** Modify: `src/data/timeline.ts`, `src/data/timeline.test.ts`, `src/data/timeline.json`, `src/timeline/spans.test.ts`, `src/timeline/layout.test.ts`（テストデータ）

**Interfaces:** Produces: `type Source = { label: string; url: string }`、`Dynasty` に `sources: Source[]; notes: string[]`、`Reign` に `title; sources: Source[]; notes: string[]`、`Person = { id; name }`。`Ref`・`Note` はなくす

- [ ] **Step 1: テストを書き換える** — `timeline.test.ts` の有効なデータを新しい形にし、Wikidata・`Note` のテストを消して次を足す: `sources` が空なら弾く（「出典がありません」）、`https://en.wikipedia.org/`・`https://zh-yue.wikipedia.org/` は通り、`https://www.wikidata.org/`・`http://ja.wikipedia.org/` は弾く（「出典の url は Wikipedia のページです」）、`label` が空なら弾く、`notes` に空の文があれば弾く、人物に知らないキー（`wikidata`）があれば弾く
- [ ] **Step 2:** Run: `pnpm test src/data` — Expected: FAIL
- [ ] **Step 3: 実装** — `QID_PATTERN`・`REF_URL`・`wikidataItem`・旧 `notes` を消し、`WIKIPEDIA_URL = /^https:\/\/[a-z][a-z-]*\.wikipedia\.org\//`、`sources()`（1 件以上、各件は `label`・`url`）、`notes()`（空でない文の配列）を足す。キーの一覧を spec §3 にそろえる
- [ ] **Step 4:** テストデータ（`spans.test.ts`・`layout.test.ts` など、型が通らないところ）を直す。`timeline.json` はテストからは読まれず実行時に取得するので、Task 4 で置き換えたデータを入れるまで、画面では読み込めないままになる（同じ PR の中で直る）
- [ ] **Step 5:** Run: `pnpm format && pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build`
- [ ] **Step 6:** Commit: `Read Wikipedia sources and note texts from the timeline data`

---

### Task 2: パネルの中身の出典を `sources` から集める

**Files:** Modify: `src/panel/content.ts`, `src/panel/content.test.ts`, `src/app/copy.ts`

- [ ] **Step 1: テストを書き換える** — 王朝は `sources` をそのまま `links` にする。在位のまとまりは、在位を年の順に並べ、その順に `sources` を集め、同じ URL は 1 つにする（例: 1912 年の在任 [ポワンカレ]、1913 年 [ポワンカレ, 第三共和政]、1926 年 [ポワンカレ] → [ポワンカレ, 第三共和政]）。行の `notes` はデータの文そのもの
- [ ] **Step 2:** Run: `pnpm test src/panel/content.test.ts` — Expected: FAIL
- [ ] **Step 3: 実装** — `links(sources: Source[]): PanelLink[]` を「同じ URL を 1 つにする」だけにし、王朝は `links(dynasty.sources)`、在位は `links(reigns.flatMap((r) => r.sources))`。`WIKIDATA_ITEM` と `COPY.wikidataLink` を消す
- [ ] **Step 4:** Run: 4 つのチェック — Expected: すべて成功
- [ ] **Step 5:** Commit: `Collect the panel links from the Wikipedia sources`

---

### Task 3: パネルで期間を先に、出典を後に置く

**Files:** Modify: `src/panel/SourcePanel.tsx`, `DESIGN.md`（出典パネルの説明に中身の順があれば合わせる）

- [ ] **Step 1:** 出典の `<section>` を期間の `<section>` の後ろに移す。出典は必ず 1 件以上あるので `content.links.length > 0 &&` を外す
- [ ] **Step 2:** Run: 4 つのチェック — Expected: すべて成功
- [ ] **Step 3:** Commit: `Show the sources after the periods in the panel`

---

### Task 4: 置き換えたデータを入れ、実ブラウザで確かめる

data リポの置き換えが承認され、`pnpm copy` で `src/data/timeline.json` が置かれてから行う。

- [ ] **Step 1:** Run: 4 つのチェック — Expected: すべて成功
- [ ] **Step 2:** 実ブラウザ（headless Chromium）で spec §9 の確認を、PC 幅と 375px 幅、表示 6 通り × 向き 2 通りで行う。注記のある王朝・在位を選んで、注記が期間の行のすぐ下に出て折り返すこと、出典が最後に出ることも確かめる
- [ ] **Step 3:** Commit: `Update the timeline data with Wikipedia sources`
