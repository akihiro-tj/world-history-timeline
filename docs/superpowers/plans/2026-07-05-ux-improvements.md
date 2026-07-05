# UX改善・PRプレビュー環境 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRプレビュー環境の整備と、表示・操作性・検索・オンボーディングにわたるUX改善一式を5本のPRで実装する。

**Architecture:** 純粋ロジックは `src/domain/` に関数追加（テストファースト）、UI は `src/components/` の既存構成を維持したまま `TopBar` / `WelcomeOverlay` を追加する。CI は既存 `ci.yml` に preview ジョブを足し、wrangler は lockfile 固定の `pnpm exec wrangler` で実行する。

**Tech Stack:** Vite + React 19 + TypeScript / Tailwind v4 / Vitest + RTL / zod / Cloudflare Workers (静的アセット) / GitHub Actions

**Spec:** `docs/superpowers/specs/2026-07-05-ux-improvements-design.md`

## Global Constraints

- Node >= 24 / pnpm（`packageManager: pnpm@11.4.0`）。検証コマンドは `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm validate-data`
- コミットメッセージは英語の conventional commits。Co-Authored-By に Claude を入れる
- UI 文言は日本語。色・タイポグラフィは DESIGN.md のトークンに従う（テキストは ink/muted のみ、アクセントは `#4a90d9`）
- コードコメントは原則書かない（Why / Warning のみ許可）
- 各 PR は **直前の PR がマージされた後の main** から分岐する（②→③→④→⑤ は直列。同一ファイルを触るため）
- PR 本文はですます調で書き、末尾に `---\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)` を付ける
- 年は整数のみ・紀元前は負数。表示変換は `src/domain/format.ts` に集約済み

## PR 一覧（実施順）

| PR | ブランチ | タスク |
| --- | --- | --- |
| ① | `ci/pr-preview-and-config` | Task 1〜5 |
| ② | `fix/layout` | Task 6〜15 |
| ③ | `feat/interaction` | Task 16〜19 |
| ④ | `feat/search` | Task 20〜23 |
| ⑤ | `feat/onboarding` | Task 24〜27 |

---

# PR① ci/pr-preview-and-config

ブランチ作成: `git checkout main && git pull && git checkout -b ci/pr-preview-and-config`

### Task 1: biome 設定の検証（変更不要と確定）

**Files:** なし（変更しない）

`biome.json` の `linter.rules.preset: "recommended"` は Biome 2.5.x の現行キーであり、そのまま維持する。`linter.rules.recommended: true` へ置き換えると lint が DEPRECATED 警告（recommended は非推奨、preset を使え）を出すことを実機で確認済み。公式設定リファレンスも preset を現行キーとしている。

- [x] **検証済み: 変更なしで `pnpm lint` が警告なしで PASS すること**

### Task 2: engines 追加と @types/node の整合

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: package.json を編集**

`"packageManager": "pnpm@11.4.0",` の次の行に追加:

```json
  "engines": {
    "node": ">=24"
  },
```

devDependencies の `"@types/node": "^26.1.0"` を CI の Node 24 に合わせて変更:

```json
    "@types/node": "^24.0.0",
```

- [ ] **Step 2: lockfile を更新して検証**

Run: `pnpm install && pnpm typecheck && pnpm test`
Expected: install で @types/node が 24 系に解決される / typecheck PASS / 91 tests PASS

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add engines field and align @types/node with node 24"
```

### Task 3: CLAUDE.md に DESIGN.md 参照を追記

**Files:**
- Modify: `CLAUDE.md`（`## 規約` セクション）

- [ ] **Step 1: 規約セクションの先頭に追記**

`## 規約` の箇条書き先頭に以下の行を追加する:

```markdown
- UI・ビジュアルの変更は DESIGN.md（デザイントークン・タイポグラフィ・Do/Don't）に従う
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reference design.md from claude.md conventions"
```

### Task 4: プレビュー環境（wrangler 設定 + CI）

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `.github/workflows/ci.yml`（全面書き換え）

**Interfaces:**
- Consumes: リポジトリ Secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`（設定済み）
- Produces: PR ごとのプレビュー URL（`pr-<PR番号>-world-history-timeline.<subdomain>.workers.dev`）と sticky コメント

- [ ] **Step 1: wrangler.jsonc に preview_urls を追加**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "world-history-timeline",
  "compatibility_date": "2026-07-04",
  "preview_urls": true,
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

- [ ] **Step 2: ci.yml を書き換え**

変更点: (a) check ジョブの dist アップロードを常時実行に変更、(b) preview ジョブ新設（same-repo PR 限定・sticky コメント）、(c) deploy ジョブを `pnpm exec wrangler deploy` に変更し concurrency を追加。

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm validate-data
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 7

  preview:
    if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository
    needs: check
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    concurrency:
      group: preview-${{ github.event.number }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - name: Upload preview version
        id: preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          pnpm exec wrangler versions upload --preview-alias "pr-${{ github.event.number }}" | tee upload.log
          url=$(grep -oE 'https://pr-${{ github.event.number }}-[^[:space:]]+\.workers\.dev' upload.log | head -n 1)
          if [ -z "$url" ]; then
            url=$(grep -oE 'https://[^[:space:]]+\.workers\.dev' upload.log | head -n 1)
          fi
          echo "url=$url" >> "$GITHUB_OUTPUT"
      - name: Comment preview URL
        uses: actions/github-script@v7
        env:
          PREVIEW_URL: ${{ steps.preview.outputs.url }}
        with:
          script: |
            const marker = '<!-- cloudflare-workers-preview -->'
            const body = [
              marker,
              '## プレビュー環境',
              '',
              `プレビュー URL: ${process.env.PREVIEW_URL}`,
              '',
              `最終更新コミット: ${context.payload.pull_request.head.sha}`,
            ].join('\n')
            const { owner, repo } = context.repo
            const issue_number = context.payload.pull_request.number
            const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number })
            const existing = comments.find((c) => c.body?.startsWith(marker))
            if (existing) {
              await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body })
            } else {
              await github.rest.issues.createComment({ owner, repo, issue_number, body })
            }

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-production
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - name: Deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: pnpm exec wrangler deploy
```

注意（Why）: wrangler-action ではなく `pnpm exec wrangler` を使うのは、実行される wrangler のバージョンを pnpm-lock.yaml に一元化するため（バージョンドリフトのフォローアップ対応）。fork からの PR は secrets を参照できないため `head.repo.full_name == github.repository` でスキップする。

- [ ] **Step 3: ローカルで wrangler 設定を検証**

Run: `pnpm build && pnpm exec wrangler deploy --dry-run`
Expected: dry-run が設定エラーなく完了する（`preview_urls` が不正キーならここで落ちる）

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc .github/workflows/ci.yml
git commit -m "ci: add pr preview deployments with sticky url comment"
```

### Task 5: PR① 作成とプレビュー環境の実機検証

**Files:** なし（GitHub 操作のみ）

- [ ] **Step 1: push して PR を作成**

```bash
git push -u origin ci/pr-preview-and-config
gh pr create --title "ci: PRプレビュー環境と設定改善" --body-file - <<'EOF'
## 概要

PR ごとに Cloudflare Workers のプレビュー環境を用意し、URL を PR コメントに自動投稿します。あわせて設定まわりの残課題（biome の recommended キー修正 / engines 追加 / @types/node の整合 / deploy の concurrency / wrangler バージョンの lockfile 一元化）を解消します。

## 変更内容

- `wrangler versions upload --preview-alias pr-<番号>` によるプレビュー URL の発行（追加プッシュでも URL は不変）
- `actions/github-script` によるプレビュー URL の sticky コメント（作成 / 更新）
- deploy / preview とも `pnpm exec wrangler` に統一し、バージョンを lockfile に固定
- biome `linter.rules.recommended: true` へ修正、`engines.node >= 24` 追加、`@types/node` を 24 系へ
- CLAUDE.md にデザイン原則（DESIGN.md）への参照を追記

## 確認方法

この PR 自体のプレビューコメントに URL が投稿され、開くとアプリが表示されることを確認してください。

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 2: CI 完了を待って検証**

Run: `gh pr checks --watch`
Expected: check / preview の両ジョブが成功

- [ ] **Step 3: プレビューコメントと URL を確認**

```bash
gh pr view --comments | grep -A2 "プレビュー環境"
curl -sI "$(gh pr view --comments | grep -oE 'https://pr-[^ ]+\.workers\.dev' | head -n1)" | head -n1
```

Expected: コメントに URL があり、curl が `HTTP/2 200` を返す。空コミットを push して同一コメントが**更新**される（コメントが増えない）ことも確認する。

失敗した場合の切り分け: (a) `versions upload` が URL を出力していない → upload.log の出力形式を Actions ログで確認し grep パターンを調整。(b) 404 → Cloudflare ダッシュボードで workers.dev サブドメインが有効か確認。

- [ ] **Step 4: マージ**

ユーザーにレビュー・マージを依頼する。**マージ完了まで PR② に着手しない。**

---

# PR② fix/layout

ブランチ作成: `git checkout main && git pull && git checkout -b fix/layout`

### Task 6: domain: dataYearRange（年軸範囲のデータ導出）

**Files:**
- Create: `src/domain/yearRange.ts`
- Test: `src/domain/yearRange.test.ts`

**Interfaces:**
- Consumes: `Entry`（`src/data/schema`）
- Produces: `type YearRange = { minYear: number; maxYear: number }` / `dataYearRange(entries: Entry[]): YearRange`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/yearRange.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { dataYearRange } from './yearRange'

describe('dataYearRange', () => {
  test('データ範囲を100年単位で外側に丸める', () => {
    const entries = [
      makeEntry({ id: 'a', start: -2987, end: -2950 }),
      makeEntry({ id: 'b', start: 1900, end: 1953 }),
    ]
    expect(dataYearRange(entries)).toEqual({ minYear: -3000, maxYear: 2000 })
  })

  test('ちょうど100年境界はそのまま使う', () => {
    const entries = [makeEntry({ id: 'a', start: -3000, end: 2000 })]
    expect(dataYearRange(entries)).toEqual({ minYear: -3000, maxYear: 2000 })
  })

  test('end のない点イベントは start を最大年の候補にする', () => {
    const entries = [
      makeEntry({ id: 'a', start: 1000, end: 1050 }),
      makeEntry({ id: 'b', type: 'event', start: 1953, end: undefined }),
    ]
    expect(dataYearRange(entries).maxYear).toBe(2000)
  })

  test('丸め後に幅が0なら最小幅100年を確保する', () => {
    const entries = [makeEntry({ id: 'a', type: 'event', start: 2000, end: undefined })]
    const range = dataYearRange(entries)
    expect(range.maxYear - range.minYear).toBe(100)
  })

  test('空配列でも幅が正の範囲を返す', () => {
    const range = dataYearRange([])
    expect(range.maxYear).toBeGreaterThan(range.minYear)
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `pnpm vitest run src/domain/yearRange.test.ts`
Expected: FAIL（`Cannot find module './yearRange'`）

- [ ] **Step 3: 実装**

`src/domain/yearRange.ts`:

```ts
import type { Entry } from '../data/schema'

const ROUNDING_YEARS = 100

export type YearRange = {
  minYear: number
  maxYear: number
}

export function dataYearRange(entries: Entry[]): YearRange {
  if (entries.length === 0) return { minYear: 0, maxYear: ROUNDING_YEARS }
  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  for (const entry of entries) {
    earliest = Math.min(earliest, entry.start)
    latest = Math.max(latest, entry.end ?? entry.start)
  }
  const minYear = Math.floor(earliest / ROUNDING_YEARS) * ROUNDING_YEARS
  const maxYear = Math.ceil(latest / ROUNDING_YEARS) * ROUNDING_YEARS
  return { minYear, maxYear: maxYear > minYear ? maxYear : minYear + ROUNDING_YEARS }
}
```

- [ ] **Step 4: テスト成功を確認して Commit**

Run: `pnpm vitest run src/domain/yearRange.test.ts`
Expected: 5 tests PASS

```bash
git add src/domain/yearRange.ts src/domain/yearRange.test.ts
git commit -m "feat(domain): derive year axis range from entry data"
```

### Task 7: 年軸範囲の統合（TimelinePage / TimeAxis / フィクスチャ番兵）

**Files:**
- Modify: `src/components/TimelinePage.tsx`
- Modify: `src/components/TimelineView.tsx`
- Modify: `src/test/fixtures.ts`
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `dataYearRange` / `YearRange`（Task 6）
- Produces: `TimelineView` の新 prop `yearRange: YearRange`（`dataset.config` の軸利用を置換）

- [ ] **Step 1: フィクスチャに範囲固定の番兵を追加**

`src/test/fixtures.ts` の `entries` 配列末尾に追加（既存テストの座標計算は `-700〜2100` 前提のため、軸がデータ由来になっても同じ範囲に固定する）:

```ts
    // 軸範囲はデータから導出されるため、既存テストの座標前提 (-700〜2100) を固定する番兵
    makeEntry({
      id: 'era-start-marker',
      title: '年表始端',
      region: 'japan',
      type: 'event',
      start: -700,
      end: undefined,
      importance: 1,
    }),
    makeEntry({
      id: 'era-end-marker',
      title: '年表終端',
      region: 'japan',
      type: 'event',
      start: 2100,
      end: undefined,
      importance: 1,
    }),
```

- [ ] **Step 2: 失敗するテストを書く（未来年が描画されないこと）**

`src/components/TimelinePage.test.tsx` に追加:

```tsx
test('年軸はデータ範囲までで、それを超える年は表示しない', () => {
  render(<TimelinePage dataset={{ ...testDataset, config: { minYear: -3000, maxYear: 3000 } }} />)
  expect(screen.getAllByText('2000年').length).toBeGreaterThan(0)
  expect(screen.queryByText('2500年')).not.toBeInTheDocument()
  expect(screen.queryByText('3000年')).not.toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 新テスト FAIL（config.maxYear=3000 まで目盛が生成され 2500年 が存在する）

- [ ] **Step 3: TimelinePage を年範囲ベースに変更**

`src/components/TimelinePage.tsx`:

```ts
import { dataYearRange } from '../domain/yearRange'
```

を追加し、コンポーネント冒頭を変更:

```ts
export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { regions, entries } = dataset
  const yearRange = useMemo(() => dataYearRange(entries), [entries])
  const totalYears = yearRange.maxYear - yearRange.minYear
```

以降、`config.minYear` を `yearRange.minYear` に、`config.maxYear` を `yearRange.maxYear` に全置換する（`jumpToEntry` / `jumpToYear` / `createScale` の3箇所と依存配列）。`const { config, ... }` から `config` を外す。

`TimelineView` へ `yearRange={yearRange}` を渡す。

- [ ] **Step 4: TimelineView / TimeAxis の props 変更**

`src/components/TimelineView.tsx`: Props に `yearRange: YearRange` を追加（`import type { YearRange } from '../domain/yearRange'`）し、TimeAxis 呼び出しを変更:

```tsx
<TimeAxis scale={scale} minYear={yearRange.minYear} maxYear={yearRange.maxYear} />
```

`dataset` からの `config` 分割代入を削除する（`regions` のみ残す）。

- [ ] **Step 5: 既存テストを新前提で更新**

`src/components/TimelinePage.test.tsx` の既存アサーションは番兵により座標前提が変わらないため、原則そのまま通る。全体を実行して失敗があれば、期待値の年数計算（`(年 - -700) * pxPerYear` 形式）を確認して直す。

Run: `pnpm test`
Expected: 全テスト PASS（`同時代リンクで選択が移動する` は Task 11 で期待値が変わるまで現状の式のまま）

- [ ] **Step 6: 実データで確認して Commit**

Run: `pnpm validate-data && pnpm typecheck && pnpm lint`
Expected: すべて PASS

```bash
git add src/components/TimelinePage.tsx src/components/TimelineView.tsx src/test/fixtures.ts src/components/TimelinePage.test.tsx
git commit -m "fix(timeline): clamp year axis to data-derived range"
```

### Task 8: domain: truncateLabel（ラベル省略）

**Files:**
- Create: `src/domain/label.ts`
- Test: `src/domain/label.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `textWidthPx(text: string, fontSizePx: number): number` / `truncateLabel(text: string, maxWidthPx: number, fontSizePx: number): string`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/label.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { textWidthPx, truncateLabel } from './label'

describe('textWidthPx', () => {
  test('全角は1em、半角は0.55emで近似する', () => {
    expect(textWidthPx('あい', 10)).toBe(20)
    expect(textWidthPx('ab', 10)).toBe(11)
    expect(textWidthPx('あa', 10)).toBe(15.5)
  })
})

describe('truncateLabel', () => {
  test('収まるテキストはそのまま返す', () => {
    expect(truncateLabel('カエサル', 44, 11)).toBe('カエサル')
  })

  test('はみ出すテキストは省略記号付きで切り詰める', () => {
    const result = truncateLabel('アレクサンドロス大王', 76, 11)
    expect(result.endsWith('…')).toBe(true)
    expect(textWidthPx(result, 11)).toBeLessThanOrEqual(76)
  })

  test('半角混在でも幅内に収める', () => {
    const result = truncateLabel('メフメト2世スルタン即位', 60, 11)
    expect(textWidthPx(result, 11)).toBeLessThanOrEqual(60)
  })

  test('極端に狭い幅では省略記号のみ返す', () => {
    expect(truncateLabel('カエサル', 10, 11)).toBe('…')
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `pnpm vitest run src/domain/label.test.ts`
Expected: FAIL（module not found）

- [ ] **Step 3: 実装**

`src/domain/label.ts`:

```ts
const FULL_WIDTH_EM = 1
const HALF_WIDTH_EM = 0.55
const ELLIPSIS = '…'
const LAST_HALF_WIDTH_CODE_POINT = 0xff

function charWidthEm(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0
  return codePoint <= LAST_HALF_WIDTH_CODE_POINT ? HALF_WIDTH_EM : FULL_WIDTH_EM
}

export function textWidthPx(text: string, fontSizePx: number): number {
  let widthEm = 0
  for (const char of text) widthEm += charWidthEm(char)
  return widthEm * fontSizePx
}

export function truncateLabel(text: string, maxWidthPx: number, fontSizePx: number): string {
  if (textWidthPx(text, fontSizePx) <= maxWidthPx) return text
  const budget = maxWidthPx - FULL_WIDTH_EM * fontSizePx
  let truncated = ''
  let used = 0
  for (const char of text) {
    const charWidth = charWidthEm(char) * fontSizePx
    if (used + charWidth > budget) break
    truncated += char
    used += charWidth
  }
  return truncated + ELLIPSIS
}
```

- [ ] **Step 4: テスト成功を確認して Commit**

Run: `pnpm vitest run src/domain/label.test.ts`
Expected: 5 tests PASS

```bash
git add src/domain/label.ts src/domain/label.test.ts
git commit -m "feat(domain): add width-approximate label truncation"
```

### Task 9: ラベル省略の統合（EntryBar / EventMarker）

**Files:**
- Modify: `src/components/EntryBar.tsx`
- Modify: `src/components/EventMarker.tsx`
- Modify: `src/components/TimelineView.tsx`

**Interfaces:**
- Consumes: `truncateLabel`（Task 8）
- Produces: `EventMarker` の新 prop `svgWidth: number`

- [ ] **Step 1: EntryBar のラベルを省略しホバー全文を付ける**

`src/components/EntryBar.tsx`: import に `truncateLabel` を追加し、定数とラベルを変更:

```ts
import { truncateLabel } from '../domain/label'

const LABEL_FONT_SIZE_PX = 11
const LABEL_PADDING_X = 6
```

`<rect …>` の直下（子要素）に全文ツールチップを追加:

```tsx
      >
        <title>{entry.title}</title>
      </rect>
```

（self-closing だった `<rect />` を開始/終了タグに変える。`onKeyDown` などの属性はそのまま）

`<text>` の中身を変更:

```tsx
          {truncateLabel(entry.title, COLUMN_WIDTH - LABEL_PADDING_X * 2, LABEL_FONT_SIZE_PX)}
```

- [ ] **Step 2: EventMarker のラベルを SVG 右端までに制限**

`src/components/EventMarker.tsx`: Props に `svgWidth: number` を追加し、以下を変更:

```tsx
import { truncateLabel } from '../domain/label'

const LABEL_FONT_SIZE_PX = 11
const LABEL_OFFSET_X = 16
const LABEL_MARGIN_RIGHT = 4
```

```tsx
export function EventMarker({ entry, laneX, column, scale, selected, onSelect, svgWidth }: Props) {
  const y = scale.yearToY(entry.start)
  const x = columnX(laneX, column)
  const labelMaxWidth = svgWidth - (x + LABEL_OFFSET_X) - LABEL_MARGIN_RIGHT
```

`<g …>` の先頭子要素に `<title>{entry.title}</title>` を追加し、`<text>` を変更:

```tsx
      <text x={x + LABEL_OFFSET_X} y={y + 4} className="pointer-events-none fill-ink text-[11px]">
        {truncateLabel(entry.title, labelMaxWidth, LABEL_FONT_SIZE_PX)}
      </text>
```

- [ ] **Step 3: TimelineView から svgWidth を渡す**

`src/components/TimelineView.tsx` の `<EventMarker …>` に `svgWidth={acc}` を追加。

- [ ] **Step 4: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: すべて PASS（aria-label は全文のままなので既存の name 検索は通る）

```bash
git add src/components/EntryBar.tsx src/components/EventMarker.tsx src/components/TimelineView.tsx
git commit -m "fix(timeline): truncate entry labels to available width"
```

### Task 10: トップバー新設と検索ボックスの収容

**Files:**
- Create: `src/components/TopBar.tsx`
- Modify: `src/components/SearchBar.tsx`（配置スタイルのみ）
- Modify: `src/components/TimelinePage.tsx`
- Modify: `src/components/TimelineView.tsx`（コンテナ高さ）
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `SearchBar`（既存 props）
- Produces: `TopBar` コンポーネント。props: `{ entries: Entry[]; onJumpToYear: (year: number) => void; onSelectEntry: (id: string) => void }`。高さは Tailwind `h-12`（48px）固定

- [ ] **Step 1: 失敗するテストを書く**

`src/components/TimelinePage.test.tsx` に追加:

```tsx
test('トップバーにタイトルと検索ボックスを表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('heading', { name: '世界史タイムライン' })).toBeInTheDocument()
  expect(screen.getByRole('banner')).toContainElement(screen.getByRole('searchbox', { name: '検索' }))
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 新テスト FAIL（heading が存在しない）

- [ ] **Step 2: TopBar を実装**

`src/components/TopBar.tsx`:

```tsx
import type { Entry } from '../data/schema'
import { SearchBar } from './SearchBar'

type Props = {
  entries: Entry[]
  onJumpToYear: (year: number) => void
  onSelectEntry: (id: string) => void
}

export function TopBar({ entries, onJumpToYear, onSelectEntry }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-panel px-3">
      <h1 className="shrink-0 text-sm font-semibold max-sm:hidden">世界史タイムライン</h1>
      <div className="mx-auto w-full max-w-72">
        <SearchBar entries={entries} onJumpToYear={onJumpToYear} onSelectEntry={onSelectEntry} />
      </div>
    </header>
  )
}
```

- [ ] **Step 3: SearchBar を fixed からバー内配置に変更**

`src/components/SearchBar.tsx` のルート div と候補リストの className を変更:

```tsx
    <div className="relative w-full">
```

候補リストの div:

```tsx
        <div
          role="listbox"
          aria-label="検索候補"
          className="absolute inset-x-0 top-full mt-1 overflow-hidden rounded-md border border-line bg-panel shadow-lg"
        >
```

- [ ] **Step 4: TimelinePage / TimelineView を更新**

`TimelinePage.tsx`: `<SearchBar …>` を `<TopBar entries={entries} onJumpToYear={jumpToYear} onSelectEntry={jumpToEntry} />` に置換（import も変更）。

`TimelineView.tsx` のスクロールコンテナ:

```tsx
      className="mt-12 h-[calc(100dvh-3rem)] overflow-auto"
```

- [ ] **Step 5: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: すべて PASS（SearchBar.test は role ベースなのでそのまま通る）

```bash
git add src/components/TopBar.tsx src/components/SearchBar.tsx src/components/TimelinePage.tsx src/components/TimelineView.tsx src/components/TimelinePage.test.tsx
git commit -m "fix(layout): move search into fixed top bar above lane headers"
```

### Task 11: パネル余白の補償とジャンプの縦横補正

**Files:**
- Modify: `src/components/layout.ts`（定数追加）
- Modify: `src/components/TimelinePage.tsx`
- Modify: `src/components/TimelineView.tsx`
- Modify: `src/components/DetailPanel.tsx`（デスクトップでトップバー下に収める）
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `laneWidth` / `columnX` 系定数、`laneLayouts`
- Produces: `layout.ts` に `PANEL_WIDTH_PX = 320` / `PANEL_HEIGHT_RATIO = 0.5` / `DESKTOP_MEDIA_QUERY = '(min-width: 768px)'`。`TimelineView` の新 prop `laneWidths: number[]` / `laneOffsets: number[]` / `panelOpen: boolean`（内部の幅計算は削除）

- [ ] **Step 1: 失敗するテストを書く**

`src/components/TimelinePage.test.tsx` に追加（jsdom の `matchMedia('(min-width: 768px)').matches` は false のためモバイル扱い。パネル高さ50%を除いた可視領域400pxの中心=200pxを引く。横は clientWidth 600 を明示スタブし、日本レーンの番兵 `年表終端` で検証: エントリ中心X = 64+416+12+44 = 536 → scrollLeft = 536 - 64 - (600-64)/2 = 204）:

```tsx
test('ジャンプはパネルを除いた可視領域の中心に縦横合わせる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'clientWidth', { value: 600, configurable: true })
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '終端')
  await userEvent.click(screen.getByRole('option', { name: /年表終端/ }))
  expect(scroll.scrollTop).toBeCloseTo((2100 - -700) * (2000 / 2800) - 200)
  expect(scroll.scrollLeft).toBeCloseTo(204)
})
```

既存テスト `同時代リンクで選択が移動する` の scrollTop 期待値を更新:

```tsx
  expect(screen.getByTestId('timeline-scroll').scrollTop).toBeCloseTo(
    (1260 - -700) * (2000 / 2800) - 200,
  )
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 上記2テスト FAIL

- [ ] **Step 2: layout.ts に定数を追加**

```ts
export const PANEL_WIDTH_PX = 320
export const PANEL_HEIGHT_RATIO = 0.5
export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'
export const FALLBACK_VIEWPORT_WIDTH = 1200
```

（Warning コメントを `PANEL_WIDTH_PX` に付ける: `// DetailPanel の md:w-80 / max-h-[50dvh] と連動。変えるときは両方変える`）

- [ ] **Step 3: TimelinePage: レーン幅計算の巻き上げとジャンプ補正**

`TimelinePage.tsx` に追加（`laneLayouts` の useMemo の直後）:

```ts
  const laneWidths = useMemo(
    () => regions.map((r) => laneWidth(laneLayouts.get(r.id))),
    [regions, laneLayouts],
  )
  const laneOffsets = useMemo(() => {
    const offsets: number[] = []
    let acc = 0
    for (const width of laneWidths) {
      offsets.push(acc)
      acc += width
    }
    return offsets
  }, [laneWidths])
```

`jumpToEntry` / `jumpToYear` を置き換え:

```ts
  const [pendingJump, setPendingJump] = useState<{ id: string } | null>(null)

  const jumpToEntry = useCallback((id: string) => {
    setSelectedId(id)
    setPendingJump({ id })
  }, [])

  const visibleViewport = useCallback(
    (panelOpen: boolean) => {
      const isDesktop = window.matchMedia(DESKTOP_MEDIA_QUERY).matches
      const container = containerRef.current
      const width = container?.clientWidth || FALLBACK_VIEWPORT_WIDTH
      return {
        height: panelOpen && !isDesktop ? viewportHeight * (1 - PANEL_HEIGHT_RATIO) : viewportHeight,
        width: Math.max(0, width - AXIS_WIDTH - (panelOpen && isDesktop ? PANEL_WIDTH_PX : 0)),
      }
    },
    [viewportHeight],
  )

  useEffect(() => {
    if (!pendingJump) return
    const entry = entries.find((e) => e.id === pendingJump.id)
    const container = containerRef.current
    setPendingJump(null)
    if (!entry || !container) return
    const viewport = visibleViewport(true)
    const laneIndex = regions.findIndex((r) => r.id === entry.region)
    const positioned = laneLayouts
      .get(entry.region)
      ?.positioned.find((p) => p.entry.id === entry.id)
    if (laneIndex >= 0 && positioned) {
      const entryCenterX =
        AXIS_WIDTH +
        laneOffsets[laneIndex] +
        LANE_PADDING +
        positioned.column * (COLUMN_WIDTH + COLUMN_GAP) +
        COLUMN_WIDTH / 2
      container.scrollLeft = Math.max(0, entryCenterX - AXIS_WIDTH - viewport.width / 2)
    }
    setZoom((prev) => ({
      ...prev,
      scrollTop: Math.max(
        0,
        (entry.start - yearRange.minYear) * prev.pxPerYear - viewport.height / 2,
      ),
    }))
  }, [pendingJump, entries, regions, laneLayouts, laneOffsets, yearRange, visibleViewport])

  const jumpToYear = useCallback(
    (year: number) => {
      const viewport = visibleViewport(selectedId !== null)
      setZoom((prev) => ({
        ...prev,
        scrollTop: Math.max(0, (year - yearRange.minYear) * prev.pxPerYear - viewport.height / 2),
      }))
    },
    [yearRange.minYear, selectedId, visibleViewport],
  )
```

import に `AXIS_WIDTH, COLUMN_GAP, COLUMN_WIDTH, DESKTOP_MEDIA_QUERY, FALLBACK_VIEWPORT_WIDTH, LANE_PADDING, PANEL_HEIGHT_RATIO, PANEL_WIDTH_PX, laneWidth` を `./layout` から追加する。

注意（Why）: `pendingJump` を state にするのは、選択によって tier 外エントリが `laneLayouts` に入った**後の**レイアウトで座標を計算する必要があるため。同一エントリへの連続ジャンプでも新しいオブジェクトで effect が再発火する。

- [ ] **Step 4: TimelineView: 幅計算を props 化しパネル余白を追加**

`TimelineView.tsx` Props に `laneWidths: number[]` / `laneOffsets: number[]` / `panelOpen: boolean` を追加し、内部の `widths` / `offsets` 計算を削除して props を使う。`acc` は `laneWidths` の合計に置換し、`acc` を参照していた箇所（`<svg width={acc}>` と `EventMarker` の `svgWidth={acc}`）を `svgWidth` に、`widths[i]` / `offsets[i]` を `laneWidths[i]` / `laneOffsets[i]` に置き換える:

```ts
  const svgWidth = laneWidths.reduce((sum, width) => sum + width, 0)
```

スクロールコンテナの className を変更:

```tsx
      className={`mt-12 h-[calc(100dvh-3rem)] overflow-auto ${panelOpen ? 'pb-[50dvh] md:pr-80 md:pb-0' : ''}`}
```

`TimelinePage` から `laneWidths={laneWidths} laneOffsets={laneOffsets} panelOpen={selectedEntry !== null}` を渡す。

- [ ] **Step 5: DetailPanel をトップバーの下に収める**

`DetailPanel.tsx` の className のデスクトップ指定を変更: `md:top-0 md:h-dvh` → `md:top-12 md:h-[calc(100dvh-3rem)]`。

- [ ] **Step 6: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: すべて PASS

```bash
git add src/components/layout.ts src/components/TimelinePage.tsx src/components/TimelineView.tsx src/components/DetailPanel.tsx src/components/TimelinePage.test.tsx
git commit -m "fix(timeline): center jumps in panel-aware viewport and pad scroll area"
```

### Task 12: ズームアンカーのヘッダー高さ補正

**Files:**
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `HEADER_HEIGHT`（`./layout`）、`zoomAt`（既存シグネチャのまま）
- Produces: `applyZoomAtContainerOffset(factor: number, containerOffset: number): void`（コンテナ座標 → コンテンツ座標の変換を一元化）

- [ ] **Step 1: 失敗するテストを書く**

コンテナ内コンテンツは LaneHeaders(40px) の下に始まるため、アンカー年の計算はオフセットから 40 を引く必要がある。scrollTop=1000・clientY=400（rect.top=0）・factor=1.2 のとき、補正後 scrollTop = (1000+360)×1.2−360 = 1272:

```tsx
test('ホイールズームのアンカーはヘッダー高さを補正する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  fireEvent.scroll(scroll, { target: { scrollTop: 1000 } })
  fireEvent.wheel(scroll, { deltaY: -100, ctrlKey: true, clientY: 400 })
  expect(scroll.scrollTop).toBeCloseTo(1272)
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: FAIL（現状は 1280 になる）

- [ ] **Step 2: 補正ヘルパーを導入**

`TimelinePage.tsx` の `applyZoom` の直後に追加し、すべてのズーム呼び出しをこれ経由にする:

```ts
  const applyZoomAtContainerOffset = useCallback(
    (factor: number, containerOffset: number) => {
      applyZoom(factor, containerOffset - HEADER_HEIGHT)
    },
    [applyZoom],
  )
```

- ピンチ（`handlePointerMove`）: `applyZoom(distanceAfter / distanceBefore, anchorOffset)` → `applyZoomAtContainerOffset(...)`
- ホイール: `applyZoom(..., e.clientY - rect.top)` → `applyZoomAtContainerOffset(..., e.clientY - rect.top)`（effect の依存配列も `applyZoomAtContainerOffset` に変更）
- ボタン: `applyZoom(BUTTON_ZOOM_FACTOR, viewportHeight / 2)` → `applyZoomAtContainerOffset(BUTTON_ZOOM_FACTOR, viewportHeight / 2)`（縮小も同様）

`HEADER_HEIGHT` を `./layout` から import する。

- [ ] **Step 3: 検証して Commit**

Run: `pnpm test`
Expected: 全 PASS（既存のズーム系テストは相対比較なので影響なし）

```bash
git add src/components/TimelinePage.tsx src/components/TimelinePage.test.tsx
git commit -m "fix(zoom): correct anchor offset for lane header height"
```

### Task 13: ズームボタンを年軸の右へオフセット

**Files:**
- Modify: `src/components/ZoomControls.tsx`

- [ ] **Step 1: 位置を変更**

```tsx
import { AXIS_WIDTH } from './layout'
```

```tsx
    <div className="fixed bottom-4 z-30 flex flex-col gap-2" style={{ left: AXIS_WIDTH + 8 }}>
```

- [ ] **Step 2: 検証して Commit**

Run: `pnpm test && pnpm lint`
Expected: PASS

```bash
git add src/components/ZoomControls.tsx
git commit -m "fix(layout): offset zoom controls past the year axis"
```

### Task 14: 初期ズームの実測後再導出

**Files:**
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/TimelinePage.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

```tsx
test('ユーザー操作前は実測高さで初期ズームを再導出する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'clientHeight', { value: 400, configurable: true })
  fireEvent(window, new Event('resize'))
  expect(barHeight(/エドワード1世/)).toBeCloseTo(35 * ((400 * 2.5) / 2800), 1)
})

test('ズーム操作後はリサイズしても倍率を再導出しない', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  const zoomed = barHeight(/エドワード1世/)
  Object.defineProperty(scroll, 'clientHeight', { value: 400, configurable: true })
  fireEvent(window, new Event('resize'))
  expect(barHeight(/エドワード1世/)).toBeCloseTo(zoomed)
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 1つ目 FAIL（フォールバック800pxのままの高さ 35×0.714≒25 になる）

- [ ] **Step 2: 実装**

`TimelinePage.tsx`:

```ts
  const hasUserZoomedRef = useRef(false)
```

`applyZoom` の先頭で `hasUserZoomedRef.current = true`。`onFitAll` のハンドラでも `hasUserZoomedRef.current = true` を設定する。

viewport 変化時の再導出 effect を追加（measure effect の後）:

```ts
  useEffect(() => {
    if (hasUserZoomedRef.current) return
    setZoom((prev) => {
      const pxPerYear = minPxPerYear(totalYears, viewportHeight)
      if (pxPerYear === prev.pxPerYear) return prev
      return { pxPerYear, scrollTop: (prev.scrollTop / prev.pxPerYear) * pxPerYear }
    })
  }, [viewportHeight, totalYears])
```

- [ ] **Step 3: 検証して Commit**

Run: `pnpm test`
Expected: 全 PASS

```bash
git add src/components/TimelinePage.tsx src/components/TimelinePage.test.tsx
git commit -m "fix(zoom): re-derive initial zoom after viewport measurement"
```

### Task 15: 小画面での最大ズーム保証 + PR② 作成

**Files:**
- Modify: `src/domain/zoom.ts`
- Test: `src/domain/zoom.test.ts`

**Interfaces:**
- Consumes: `TIER3_MIN_PX_PER_YEAR = 4`（`visibility.ts`、値のみ参照）
- Produces: `maxPxPerYear` が常に 5 以上を返す

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/zoom.test.ts` の `clampPxPerYear` describe に追加:

```ts
  test('小さい viewport でも importance 3 のしきい値(4px/年)に届く上限を保証する', () => {
    expect(maxPxPerYear(300)).toBe(5)
    expect(maxPxPerYear(400)).toBe(5)
    expect(maxPxPerYear(800)).toBe(8)
  })
```

Run: `pnpm vitest run src/domain/zoom.test.ts`
Expected: FAIL（300/100=3, 400/100=4 が返る）

- [ ] **Step 2: 実装**

`src/domain/zoom.ts`:

```ts
const FIT_ALL_SCREENS = 2.5
const CENTURY_YEARS = 100
const TIER3_GUARANTEE_PX_PER_YEAR = 5

export function maxPxPerYear(viewportHeight: number): number {
  return Math.max(viewportHeight / CENTURY_YEARS, TIER3_GUARANTEE_PX_PER_YEAR)
}
```

（Why コメント可: `// 5 = visibility.ts の TIER3_MIN_PX_PER_YEAR(4) を確実に超える下限`）

- [ ] **Step 3: 検証して Commit**

Run: `pnpm test`
Expected: 全 PASS

```bash
git add src/domain/zoom.ts src/domain/zoom.test.ts
git commit -m "fix(zoom): guarantee max zoom reaches tier-3 threshold on small viewports"
```

- [ ] **Step 4: PR② を作成して実機検証**

```bash
git push -u origin fix/layout
gh pr create --title "fix: 表示・レイアウトの不具合修正" --body-file - <<'EOF'
## 概要

年軸・ラベル・固定UIの重なり・パネル関連の表示不具合をまとめて修正します。

## 変更内容

- 年軸の範囲をデータから導出し、データの無い未来年（2050 など）を表示しないようにしました（実データでは 2000 年まで）
- 人名・イベント名をカラム幅・SVG 右端に収まるよう省略記号付きで切り詰め、ホバーで全文を表示するようにしました
- 検索ボックスを固定トップバーに移し、レーンヘッダーと重ならないようにしました
- ズームボタンを年軸の右隣に移動し、年ラベルとの重なりを解消しました
- 詳細パネル表示中はスクロール領域に余白を追加し、右端・下端のエントリにも到達できるようにしました
- パネル内リンクからのジャンプを「パネルを除いた可視領域」の中心に縦横合わせるようにしました
- ズームアンカーのヘッダー高さ補正・初期ズームの実測後再導出・小画面での最大ズーム保証を実装しました

## 確認方法

プレビュー URL で以下をご確認ください。

- [ ] 年軸が 2000 年で終わっている（2050 が出ない）
- [ ] 長い名前が「…」で省略され、ホバーで全文が見える
- [ ] 検索ボックスがレーンヘッダーに重ならない
- [ ] ズームボタンが年表示に重ならない
- [ ] パネルを開いた状態で右端・下端のエントリまでスクロールできる
- [ ] 同時代リンクのクリックで対象がパネルに隠れず画面中央に来る

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr checks --watch
```

プレビュー URL（PR コメント）で上記チェックリストを目視確認し、問題なければユーザーにマージを依頼する。**マージまで PR③ に着手しない。**

---

# PR③ feat/interaction

ブランチ作成: `git checkout main && git pull && git checkout -b feat/interaction`

### Task 16: button のカーソルをグローバルで pointer に

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: グローバルスタイルを追加**

`src/index.css` の `body` ルールの後に追加（Tailwind v4 の preflight は button を `cursor: default` にするため明示が必要）:

```css
button {
  cursor: pointer;
}
```

- [ ] **Step 2: 検証して Commit**

Run: `pnpm lint && pnpm test`
Expected: PASS。`pnpm dev` でズームボタン・閉じるボタン・同時代リンク・検索候補にポインタが出ることを目視確認。

```bash
git add src/index.css
git commit -m "feat(ui): show pointer cursor on all buttons"
```

### Task 17: 選択スタイルをアクセント枠+白ハローに変更

**Files:**
- Modify: `src/components/EntryBar.tsx`
- Modify: `src/components/EventMarker.tsx`
- Modify: `DESIGN.md`
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: CSS 変数 `--color-accent`（#4a90d9）/ `--color-panel`（#ffffff）
- Produces: なし（描画変更のみ）

- [ ] **Step 1: 失敗するテストを書く**

```tsx
test('選択中エントリにアクセント色のリングが付く', async () => {
  const { container } = render(<TimelinePage dataset={testDataset} />)
  expect(container.querySelector('[stroke="var(--color-accent)"]')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(container.querySelector('rect[stroke="var(--color-accent)"]')).toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: FAIL

- [ ] **Step 2: EntryBar の選択リングを実装**

`EntryBar.tsx`: メイン rect から `stroke` / `strokeWidth` プロパティを削除し、`</rect>` の後（`{showLabel && …}` の前）に追加:

```tsx
      {selected && (
        <>
          <rect
            x={x}
            y={top}
            width={COLUMN_WIDTH}
            height={height}
            rx={4}
            fill="none"
            stroke="var(--color-panel)"
            strokeWidth={6}
            className="pointer-events-none"
          />
          <rect
            x={x}
            y={top}
            width={COLUMN_WIDTH}
            height={height}
            rx={4}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            className="pointer-events-none"
          />
        </>
      )}
```

- [ ] **Step 3: EventMarker の選択リングを実装**

`EventMarker.tsx`: `<path>` から `stroke` / `strokeWidth` を削除し、path の変数化と選択リングを追加:

```tsx
  const diamondPath = `M ${x + 6} ${y - 6} L ${x + 12} ${y} L ${x + 6} ${y + 6} L ${x} ${y} Z`
```

```tsx
      <path d={diamondPath} fill="var(--color-event)" />
      {selected && (
        <>
          <path d={diamondPath} fill="none" stroke="var(--color-panel)" strokeWidth={6} />
          <path d={diamondPath} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} />
        </>
      )}
```

- [ ] **Step 4: DESIGN.md に用途を追記**

`## Colors` の箇条書きに追加:

```markdown
- {colors.accent}: 選択中エントリの枠色。白のハローを外側に重ね、どのバー色の上でも視認できるようにする
```

- [ ] **Step 5: 検証して Commit**

Run: `pnpm test && pnpm lint`
Expected: 全 PASS

```bash
git add src/components/EntryBar.tsx src/components/EventMarker.tsx DESIGN.md src/components/TimelinePage.test.tsx
git commit -m "feat(ui): accent selection ring with white halo"
```

### Task 18: マウスドラッグパン + grab カーソル

**Files:**
- Modify: `src/components/TimelinePage.tsx`
- Modify: `src/components/TimelineView.tsx`
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: 既存の pointers ref（ピンチ用）・window pointerup リスナー
- Produces: `TimelineView` の新 prop `dragging: boolean`

- [ ] **Step 1: 失敗するテストを書く**

```tsx
test('マウスドラッグでスクロールする', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  fireEvent.pointerDown(scroll, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 200, clientY: 300 })
  fireEvent.pointerMove(scroll, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 250 })
  expect(scroll.scrollTop).toBe(50)
})

test('ドラッグ直後のクリックはエントリ選択にならない', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  const bar = screen.getByRole('button', { name: /エドワード1世/ })
  fireEvent.pointerDown(scroll, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 200, clientY: 300 })
  fireEvent.pointerMove(scroll, { pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 250 })
  fireEvent.pointerUp(window, { pointerId: 1 })
  fireEvent.click(bar)
  expect(screen.queryByRole('complementary', { name: '詳細' })).not.toBeInTheDocument()
  await userEvent.click(bar)
  expect(screen.getByRole('complementary', { name: '詳細' })).toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 両方 FAIL

- [ ] **Step 2: ドラッグパンを実装**

`TimelinePage.tsx` に定数と ref / state を追加:

```ts
const DRAG_THRESHOLD_PX = 5
```

```ts
  const dragOrigin = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    scrollLeft: number
    scrollTop: number
  } | null>(null)
  const suppressClickRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
```

`handlePointerDown` を変更:

```ts
  const handlePointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      dragOrigin.current = null
      setIsDragging(false)
      return
    }
    const container = containerRef.current
    if (e.pointerType !== 'mouse' || e.button !== 0 || !container) return
    dragOrigin.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }
```

`handlePointerMove` の先頭（ピンチ判定の前）に追加:

```ts
    const drag = dragOrigin.current
    if (drag && drag.pointerId === e.pointerId && pointers.current.size < 2) {
      const dx = e.clientX - drag.clientX
      const dy = e.clientY - drag.clientY
      if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) setIsDragging(true)
      if (isDragging || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        const container = containerRef.current
        if (container) {
          container.scrollLeft = drag.scrollLeft - dx
          container.scrollTop = drag.scrollTop - dy
        }
      }
    }
```

window の pointerup / pointercancel リスナー（既存 effect）を拡張:

```ts
    const removePointer = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId)
      if (dragOrigin.current?.pointerId === e.pointerId) {
        dragOrigin.current = null
        setIsDragging(false)
        if (isDraggingRef.current) suppressClickRef.current = true
      }
    }
```

`isDragging` の最新値を effect 内で読むため ref ミラーを併設する:

```ts
  const isDraggingRef = useRef(false)
  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])
```

ルート div にクリック抑止を追加:

```tsx
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
```

`TimelineView` に `dragging={isDragging}` を渡す。

- [ ] **Step 3: TimelineView にカーソルと選択抑止を追加**

Props に `dragging: boolean` を追加し、コンテナ className を変更:

```tsx
      className={`mt-12 h-[calc(100dvh-3rem)] overflow-auto ${
        dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
      } ${panelOpen ? 'pb-[50dvh] md:pr-80 md:pb-0' : ''}`}
```

- [ ] **Step 4: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全 PASS

```bash
git add src/components/TimelinePage.tsx src/components/TimelineView.tsx src/components/TimelinePage.test.tsx
git commit -m "feat(interaction): mouse drag panning with grab cursor"
```

### Task 19: ホイールズームの deltaY 比例化 + PR③ 作成

**Files:**
- Modify: `src/domain/zoom.ts`
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/domain/zoom.test.ts` / `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: なし
- Produces: `wheelZoomFactor(deltaY: number): number`（1イベントの係数を [0.8, 1.25] にクランプ）

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/zoom.test.ts` に追加:

```ts
describe('wheelZoomFactor', () => {
  test('deltaY 0 では1倍', () => {
    expect(wheelZoomFactor(0)).toBe(1)
  })

  test('小さいピンチは小さく、大きいピンチは大きくズームする', () => {
    expect(wheelZoomFactor(-10)).toBeCloseTo(Math.exp(0.08))
    expect(wheelZoomFactor(-10)).toBeLessThan(wheelZoomFactor(-20))
  })

  test('1イベントの係数を [0.8, 1.25] にクランプする', () => {
    expect(wheelZoomFactor(-1000)).toBe(1.25)
    expect(wheelZoomFactor(1000)).toBe(0.8)
  })
})
```

Run: `pnpm vitest run src/domain/zoom.test.ts`
Expected: FAIL（wheelZoomFactor 未定義）

- [ ] **Step 2: 実装**

`src/domain/zoom.ts` に追加:

```ts
const WHEEL_ZOOM_SENSITIVITY = 0.008
const WHEEL_FACTOR_MIN = 0.8
const WHEEL_FACTOR_MAX = 1.25

export function wheelZoomFactor(deltaY: number): number {
  const factor = Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY)
  return Math.min(Math.max(factor, WHEEL_FACTOR_MIN), WHEEL_FACTOR_MAX)
}
```

- [ ] **Step 3: TimelinePage のホイール処理を置換**

`WHEEL_ZOOM_FACTOR` 定数を削除し、import に `wheelZoomFactor` を追加。ホイールハンドラを変更:

```ts
      applyZoomAtContainerOffset(wheelZoomFactor(e.deltaY), e.clientY - rect.top)
```

Task 12 のテスト `ホイールズームのアンカーはヘッダー高さを補正する` の期待値を更新（deltaY=-100 → クランプで 1.25 倍）:

```tsx
  expect(scroll.scrollTop).toBeCloseTo(1360 * 1.25 - 360)
```

- [ ] **Step 4: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全 PASS

```bash
git add src/domain/zoom.ts src/domain/zoom.test.ts src/components/TimelinePage.tsx src/components/TimelinePage.test.tsx
git commit -m "feat(zoom): scale wheel zoom by trackpad delta"
```

- [ ] **Step 5: PR③ を作成して実機検証**

```bash
git push -u origin feat/interaction
gh pr create --title "feat: 操作性の改善（カーソル・選択色・ドラッグパン・ズーム感度）" --body-file - <<'EOF'
## 概要

ポインタ操作まわりの体験を改善します。

## 変更内容

- すべてのボタンにポインタカーソルを表示するようにしました
- 選択枠を黒からアクセント青 + 白ハローに変更し、どのバー色の上でも視認できるようにしました
- マウスでのドラッグパンを追加しました（cursor: grab / grabbing、5px 未満はクリック扱い）
- トラックパッドのピンチズームを移動量に比例した連続ズームに変更しました

## 確認方法

プレビュー URL で以下をご確認ください。

- [ ] ボタン類にポインタカーソルが出る
- [ ] 選択枠が青 + 白ハローで見やすい
- [ ] 空白部をドラッグしてパンできる。ドラッグ後にエントリが誤選択されない
- [ ] トラックパッドのピンチで滑らかにズームできる

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr checks --watch
```

プレビューで確認後、ユーザーにマージを依頼。**マージまで PR④ に着手しない。**

---

# PR④ feat/search

ブランチ作成: `git checkout main && git pull && git checkout -b feat/search`

### Task 20: reading フィールド導入（スキーマ + 全201件のデータ付与）

**Files:**
- Modify: `src/data/schema.ts`
- Modify: `src/test/factory.ts`
- Modify: `src/test/fixtures.ts`
- Modify: `public/data/entries.json`（全201件）
- Modify: `src/data/schema.test.ts` / `src/data/load.test.ts` / `src/data/validate.test.ts`（エントリリテラルに reading 追加）
- Test: `src/data/schema.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `Entry` 型に `reading: string`（ひらがな・長音・中黒・空白のみ、必須）

- [ ] **Step 1: 失敗するテストを書く**

`src/data/schema.test.ts` に追加（既存テストのスタイルに合わせる）:

```ts
test('reading が無いエントリは拒否する', () => {
  const entry = {
    id: 'test',
    type: 'event',
    region: 'west-europe',
    title: 'テスト',
    start: 1000,
    importance: 1,
    description: 'テスト。',
  }
  expect(entrySchema.safeParse(entry).success).toBe(false)
})

test('reading にカタカナ・漢字・英数字は使えない', () => {
  const base = {
    id: 'test',
    type: 'event',
    region: 'west-europe',
    title: 'テスト',
    start: 1000,
    importance: 1,
    description: 'テスト。',
  }
  expect(entrySchema.safeParse({ ...base, reading: 'テスト' }).success).toBe(false)
  expect(entrySchema.safeParse({ ...base, reading: 'test' }).success).toBe(false)
  expect(entrySchema.safeParse({ ...base, reading: 'まるこ・ぽーろ' }).success).toBe(true)
})
```

Run: `pnpm vitest run src/data/schema.test.ts`
Expected: 新テスト FAIL

- [ ] **Step 2: スキーマに reading を追加**

`src/data/schema.ts` の entrySchema、`title` の次に追加:

```ts
    reading: z.string().regex(/^[ぁ-ゖー・\s]+$/),
```

- [ ] **Step 3: テストヘルパを更新**

`src/test/factory.ts` のデフォルトに `reading: 'てすとよみ',` を追加（`title: over.id,` の次の行）。

`src/test/fixtures.ts` の各エントリに reading を明示:

| id | reading |
| --- | --- |
| edward-1 | `えどわーどいっせい` |
| philippe-4 | `ふぃりっぷよんせい` |
| kublai-khan | `ふびらい・はん` |
| marco-polo | `まるこ・ぽーろ` |
| anagni | `あなーにじけん` |
| tokimune | `ほうじょうときむね` |
| era-start-marker | `ねんぴょうしたん` |
| era-end-marker | `ねんぴょうしゅうたん` |

`pnpm typecheck` を実行し、Entry リテラルを直接書いているすべてのファイル（`src/data/schema.test.ts` / `load.test.ts` / `validate.test.ts` など、typecheck が列挙するもの全部）に `reading: '<そのタイトルのひらがな読み>'` を追加する。`makeEntry` 経由の箇所はデフォルト値で解決される。

- [ ] **Step 4: 全201件に読みを付与**

`public/data/entries.json` の全エントリに `"reading"` を追加する（`"title"` の直後のキーとして）。作業ルール:

- ひらがな・長音「ー」・中黒「・」のみ。数字は読み下す（例: ルイ14世 → `るいじゅうよんせい`、第一次世界大戦 → `だいいちじせかいたいせん`）
- 教科書標準の読みだけを使う。読みに確信が持てない場合は Web で裏取りしてから記載する（正確性 > 網羅性）
- region ごとに分割して進め、各バッチ後に `pnpm validate-data` で形式を検証する

- [ ] **Step 5: 全検証して Commit**

Run: `pnpm validate-data && pnpm test && pnpm typecheck`
Expected: `OK: 8 regions, 201 entries` / 全テスト PASS

```bash
git add src/data/schema.ts src/test/factory.ts src/test/fixtures.ts public/data/entries.json src/data/schema.test.ts src/data/load.test.ts src/data/validate.test.ts
git commit -m "feat(data): add hiragana reading field to all entries"
```

### Task 21: かな正規化検索（toHiragana + searchEntries）

**Files:**
- Modify: `src/domain/query.ts`
- Test: `src/domain/query.test.ts`

**Interfaces:**
- Consumes: `Entry.reading`（Task 20）
- Produces: `toHiragana(text: string): string`（カタカナ→ひらがな + 英字小文字化）。`searchEntries` はタイトル or 読みへの正規化部分一致に変わる（シグネチャ不変）

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/query.test.ts` に追加:

```ts
import { makeEntry } from '../test/factory'
import { parseQuery, searchEntries, toHiragana } from './query'

describe('toHiragana', () => {
  test('カタカナをひらがなに変換する', () => {
    expect(toHiragana('アレクサンドロス')).toBe('あれくさんどろす')
    expect(toHiragana('マルコ・ポーロ')).toBe('まるこ・ぽーろ')
  })

  test('ひらがな・漢字はそのまま', () => {
    expect(toHiragana('織田信長')).toBe('織田信長')
    expect(toHiragana('おだ')).toBe('おだ')
  })
})

describe('searchEntries (かな対応)', () => {
  const entries = [
    makeEntry({ id: 'alexander', title: 'アレクサンドロス', reading: 'あれくさんどろす' }),
    makeEntry({ id: 'nobunaga', title: '織田信長', reading: 'おだのぶなが' }),
  ]

  test('ひらがなでカタカナ名がヒットする', () => {
    expect(searchEntries(entries, 'あ').map((e) => e.id)).toContain('alexander')
  })

  test('ひらがなで漢字名が読みからヒットする', () => {
    expect(searchEntries(entries, 'おだ').map((e) => e.id)).toEqual(['nobunaga'])
  })

  test('漢字の部分一致も引き続きヒットする', () => {
    expect(searchEntries(entries, '織田').map((e) => e.id)).toEqual(['nobunaga'])
  })
})
```

テストカバレッジのフォローアップとして、既存の `parseQuery` / `searchEntries` に以下も追加する（無ければ）:

```ts
test('「前300年」の年付き表記も紀元前として解釈する', () => {
  expect(parseQuery('前300年')).toEqual({ kind: 'year', year: -300 })
})

test('limit を超える候補は importance・start 順の上位だけ返す', () => {
  const many = Array.from({ length: 10 }, (_, i) =>
    makeEntry({ id: `same-${i}`, title: `同名${i}`, reading: 'どうめい', start: 1000 + i }),
  )
  const results = searchEntries(many, 'どうめい')
  expect(results.map((e) => e.id)).toEqual(
    Array.from({ length: 8 }, (_, i) => `same-${i}`),
  )
})
```

Run: `pnpm vitest run src/domain/query.test.ts`
Expected: FAIL（toHiragana 未定義）

- [ ] **Step 2: 実装**

`src/domain/query.ts`:

```ts
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60

export function toHiragana(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - KATAKANA_TO_HIRAGANA_OFFSET),
    )
}

export function searchEntries(entries: Entry[], text: string, limit = 8): Entry[] {
  const normalizedQuery = toHiragana(text)
  return entries
    .filter(
      (e) => toHiragana(e.title).includes(normalizedQuery) || e.reading.includes(normalizedQuery),
    )
    .sort((a, b) => a.importance - b.importance || a.start - b.start)
    .slice(0, limit)
}
```

- [ ] **Step 3: 検証して Commit**

Run: `pnpm test`
Expected: 全 PASS（TimelinePage.test の 'マルコ' 検索はタイトル一致のまま通る）

```bash
git add src/domain/query.ts src/domain/query.test.ts
git commit -m "feat(search): match hiragana input against titles and readings"
```

### Task 22: プレースホルダー変更

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Test: `src/components/SearchBar.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

```tsx
test('プレースホルダーに名前と年の例を示す', () => {
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={() => {}} onSelectEntry={() => {}} />,
  )
  expect(screen.getByPlaceholderText('名前または年（例: 信長 / 1600）')).toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/SearchBar.test.tsx`
Expected: FAIL

- [ ] **Step 2: 変更**

```tsx
        placeholder="名前または年（例: 信長 / 1600）"
```

- [ ] **Step 3: 検証して Commit**

Run: `pnpm test`

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.test.tsx
git commit -m "feat(search): clarify placeholder with name and year examples"
```

### Task 23: 検索候補のキーボード操作 + PR④ 作成

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Test: `src/components/SearchBar.test.tsx`

**Interfaces:**
- Consumes: なし
- Produces: 候補リストの ↑↓ / Enter / Escape 操作、`aria-activedescendant` / 動的 `aria-selected`

- [ ] **Step 1: 失敗するテストを書く**

```tsx
test('↑↓とEnterで候補を選択できる', async () => {
  const onSelectEntry = vi.fn()
  render(
    <SearchBar
      entries={testDataset.entries}
      onJumpToYear={() => {}}
      onSelectEntry={onSelectEntry}
    />,
  )
  const input = screen.getByRole('searchbox', { name: '検索' })
  await userEvent.type(input, 'まるこ')
  await userEvent.keyboard('{ArrowDown}')
  expect(screen.getByRole('option', { name: /マルコ・ポーロ/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await userEvent.keyboard('{Enter}')
  expect(onSelectEntry).toHaveBeenCalledWith('marco-polo')
})

test('Escapeで候補リストを閉じる', async () => {
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={() => {}} onSelectEntry={() => {}} />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), 'まるこ')
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/SearchBar.test.tsx`
Expected: FAIL

- [ ] **Step 2: 実装**

`src/components/SearchBar.tsx` を以下の構成に変更:

```tsx
import { useMemo, useState } from 'react'
import type { Entry } from '../data/schema'
import { formatSpan } from '../domain/format'
import { parseQuery, searchEntries } from '../domain/query'

type Props = {
  entries: Entry[]
  onJumpToYear: (year: number) => void
  onSelectEntry: (id: string) => void
}

export function SearchBar({ entries, onJumpToYear, onSelectEntry }: Props) {
  const [input, setInput] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isListDismissed, setIsListDismissed] = useState(false)
  const query = useMemo(() => parseQuery(input), [input])
  const candidates = useMemo(
    () => (query.kind === 'name' ? searchEntries(entries, query.text) : []),
    [entries, query],
  )
  const isListOpen = candidates.length > 0 && !isListDismissed

  const selectCandidate = (id: string) => {
    onSelectEntry(id)
    setInput('')
    setActiveIndex(-1)
  }

  return (
    <div className="relative w-full">
      <input
        type="search"
        aria-label="検索"
        placeholder="名前または年（例: 信長 / 1600）"
        aria-activedescendant={
          isListOpen && activeIndex >= 0 ? `search-option-${candidates[activeIndex].id}` : undefined
        }
        className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-sm"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setActiveIndex(-1)
          setIsListDismissed(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.kind === 'year') {
            onJumpToYear(query.year)
            setInput('')
            return
          }
          if (!isListOpen) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, candidates.length - 1))
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, -1))
            return
          }
          if (e.key === 'Enter' && activeIndex >= 0) {
            selectCandidate(candidates[activeIndex].id)
            return
          }
          if (e.key === 'Escape') {
            setIsListDismissed(true)
            setActiveIndex(-1)
          }
        }}
      />
      {isListOpen && (
        <div
          role="listbox"
          aria-label="検索候補"
          className="absolute inset-x-0 top-full mt-1 overflow-hidden rounded-md border border-line bg-panel shadow-lg"
        >
          {candidates.map((entry, index) => (
            <div key={entry.id}>
              <button
                type="button"
                role="option"
                id={`search-option-${entry.id}`}
                aria-selected={index === activeIndex}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-surface ${
                  index === activeIndex ? 'bg-surface' : ''
                }`}
                onClick={() => selectCandidate(entry.id)}
              >
                {entry.title}
                <span className="ml-1 text-xs text-muted">
                  {formatSpan(entry.start, entry.end)}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全 PASS

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.test.tsx
git commit -m "feat(search): keyboard navigation for search candidates"
```

- [ ] **Step 4: PR④ を作成して実機検証**

```bash
git push -u origin feat/search
gh pr create --title "feat: 検索の強化（かな検索・読み仮名・キーボード操作）" --body-file - <<'EOF'
## 概要

検索をひらがな入力に対応させ、操作性を改善します。

## 変更内容

- 全 201 エントリに読み仮名（reading）を追加し、スキーマ・validate-data で形式を検証するようにしました
- 検索をかな正規化し、「あ」→ アレクサンドロス、「おだ」→ 織田信長 のように引けるようにしました
- プレースホルダーを「名前または年（例: 信長 / 1600）」に変更しました
- 候補リストを ↑↓ / Enter / Escape で操作できるようにしました

## 確認方法

プレビュー URL で以下をご確認ください。

- [ ] 「あ」でアレクサンドロス等のカタカナ名が候補に出る
- [ ] 「おだ」で織田信長が候補に出る
- [ ] ↑↓ で候補を移動して Enter で選択できる。Escape でリストが閉じる

読み仮名の正確性は `public/data/entries.json` の diff を数件サンプリングしてご確認ください。

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr checks --watch
```

プレビューで確認後、ユーザーにマージを依頼。**マージまで PR⑤ に着手しない。**

---

# PR⑤ feat/onboarding

ブランチ作成: `git checkout main && git pull && git checkout -b feat/onboarding`

### Task 24: ウェルカムオーバーレイ（初回表示 + ヘルプ再表示）

**Files:**
- Create: `src/components/onboardingStorage.ts`
- Create: `src/components/WelcomeOverlay.tsx`
- Modify: `src/components/TopBar.tsx`（? ボタン追加）
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `TopBar`（Task 10）
- Produces: `hasSeenOnboarding(): boolean` / `markOnboardingSeen(): void`。`WelcomeOverlay` props: `{ onClose: () => void }`。`TopBar` の新 prop `onOpenHelp: () => void`

- [ ] **Step 1: 失敗するテストを書く**

`src/components/TimelinePage.test.tsx` に追加:

```tsx
test('初回訪問時はウェルカムオーバーレイを表示し、閉じると次回は出ない', async () => {
  localStorage.clear()
  const { unmount } = render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('dialog', { name: 'つかいかた' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'はじめる' }))
  expect(screen.queryByRole('dialog', { name: 'つかいかた' })).not.toBeInTheDocument()
  unmount()
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('dialog', { name: 'つかいかた' })).not.toBeInTheDocument()
})

test('ヘルプボタンでオーバーレイを再表示できる', async () => {
  localStorage.setItem('whtl:onboarding:v1', 'done')
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('dialog', { name: 'つかいかた' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'つかいかた' }))
  expect(screen.getByRole('dialog', { name: 'つかいかた' })).toBeInTheDocument()
})
```

既存テストは初回オーバーレイが出ると操作をブロックするため、`src/components/TimelinePage.test.tsx` のトップに以下を追加する:

```tsx
beforeEach(() => {
  localStorage.setItem('whtl:onboarding:v1', 'done')
})
```

（`beforeEach` を vitest import に追加。新テスト1つ目は `localStorage.clear()` で上書きする）

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 新テスト FAIL

- [ ] **Step 2: ストレージヘルパを実装**

`src/components/onboardingStorage.ts`:

```ts
const STORAGE_KEY = 'whtl:onboarding:v1'
const SEEN_VALUE = 'done'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === SEEN_VALUE
  } catch {
    return true
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, SEEN_VALUE)
  } catch {
    // ストレージ不可の環境では毎回表示を避けるため何もしない
  }
}
```

- [ ] **Step 3: WelcomeOverlay を実装**

`src/components/WelcomeOverlay.tsx`:

```tsx
import { useEffect } from 'react'

const GUIDE_ITEMS = [
  { icon: '↕', text: 'スクロールで時代を移動' },
  { icon: '＋−', text: 'ズームするほど詳しい人物・事件が現れる（ピンチ対応）' },
  { icon: '▭', text: 'バーや ◆ をクリックすると解説と同時代の出来事を表示' },
  { icon: '🔍', text: '名前や年号を入力してジャンプ' },
] as const

type Props = {
  onClose: () => void
}

export function WelcomeOverlay({ onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="つかいかた"
        className="w-full max-w-sm rounded-md bg-panel p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">世界史タイムラインへようこそ</h2>
        <ul className="mt-4 space-y-3">
          {GUIDE_ITEMS.map((item) => (
            <li key={item.text} className="flex items-start gap-3 text-sm leading-relaxed">
              <span className="w-10 shrink-0 text-center text-muted">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-5 w-full rounded-md bg-accent py-2 text-sm font-medium text-white"
          onClick={onClose}
        >
          はじめる
        </button>
        <p className="mt-2 text-center text-xs text-muted">右上の ? からいつでも見返せます</p>
      </section>
    </div>
  )
}
```

スクリムの div（`onClick` 付き非インタラクティブ要素）に biome の a11y ルールが指摘を出した場合は、Escape ハンドラで keyboard 操作を代替していることを根拠に、その行へ `biome-ignore` コメント（ルール名付き）を付ける。

- [ ] **Step 4: TopBar に ? ボタンを追加**

`TopBar.tsx` Props に `onOpenHelp: () => void` を追加し、`</header>` 直前に:

```tsx
      <button
        type="button"
        aria-label="つかいかた"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sm text-muted"
        onClick={onOpenHelp}
      >
        ?
      </button>
```

- [ ] **Step 5: TimelinePage に組み込む**

```ts
import { hasSeenOnboarding, markOnboardingSeen } from './onboardingStorage'
import { WelcomeOverlay } from './WelcomeOverlay'
```

```ts
  const [isHelpOpen, setIsHelpOpen] = useState(() => !hasSeenOnboarding())
  const closeHelp = useCallback(() => {
    markOnboardingSeen()
    setIsHelpOpen(false)
  }, [])
```

`TopBar` に `onOpenHelp={() => setIsHelpOpen(true)}` を渡し、JSX 末尾（DetailPanel の後）に:

```tsx
      {isHelpOpen && <WelcomeOverlay onClose={closeHelp} />}
```

- [ ] **Step 6: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全 PASS

```bash
git add src/components/onboardingStorage.ts src/components/WelcomeOverlay.tsx src/components/TopBar.tsx src/components/TimelinePage.tsx src/components/TimelinePage.test.tsx
git commit -m "feat(onboarding): first-visit welcome overlay with help reopen"
```

### Task 25: 国名2段ヘッダー（domain: columnGroupNames）

**Files:**
- Modify: `src/domain/packing.ts`
- Modify: `src/components/layout.ts`（`GROUP_HEADER_HEIGHT` 追加）
- Modify: `src/components/LaneHeaders.tsx`
- Modify: `src/components/TimelineView.tsx`
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/domain/packing.test.ts` / `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `LaneLayout`（既存）、`maxVisibleImportance`
- Produces: `columnGroupNames(layout: LaneLayout): (string | null)[]`。`LaneHeaders` の新 props `groupLabels: (string | null)[][]` / `showGroupRow: boolean`。`layout.ts` に `GROUP_HEADER_HEIGHT = 20`

- [ ] **Step 1: 失敗する domain テストを書く**

`src/domain/packing.test.ts` に追加:

```ts
import { columnGroupNames, packLane } from './packing'

describe('columnGroupNames', () => {
  test('カラムごとに groupName を返し、group の無いカラムは null', () => {
    const layout = packLane([
      makeEntry({ id: 'e1', group: 'england', groupName: 'イングランド', start: 1200, end: 1300 }),
      makeEntry({ id: 'f1', group: 'france', groupName: 'フランス', start: 1250, end: 1350 }),
      makeEntry({ id: 'solo', type: 'event', start: 1250, end: undefined }),
    ])
    const names = columnGroupNames(layout)
    expect(names).toHaveLength(layout.columnCount)
    expect(names).toContain('イングランド')
    expect(names).toContain('フランス')
    expect(names).toContain(null)
  })
})
```

（`makeEntry` の import が無ければ追加。既存テストの describe 構成に合わせる）

Run: `pnpm vitest run src/domain/packing.test.ts`
Expected: FAIL

- [ ] **Step 2: columnGroupNames を実装**

`src/domain/packing.ts` 末尾に追加:

```ts
export function columnGroupNames(layout: LaneLayout): (string | null)[] {
  const names: (string | null)[] = new Array(layout.columnCount).fill(null)
  for (const { entry, column } of layout.positioned) {
    if (entry.groupName !== undefined && names[column] === null) {
      names[column] = entry.groupName
    }
  }
  return names
}
```

- [ ] **Step 3: 失敗する RTL テストを書く**

`src/components/TimelinePage.test.tsx` に追加（tier1 の全体表示では出さず、ズームで tier2 になったら表示）:

```tsx
test('ズームすると国名の2段目ヘッダーが表示される', async () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByText('イングランド')).not.toBeInTheDocument()
  const zoomIn = screen.getByRole('button', { name: '拡大' })
  await userEvent.click(zoomIn)
  await userEvent.click(zoomIn)
  expect(screen.getByText('イングランド')).toBeInTheDocument()
  expect(screen.getByText('フランス')).toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: FAIL

- [ ] **Step 4: LaneHeaders を2段対応にする**

`src/components/layout.ts` に追加:

```ts
export const GROUP_HEADER_HEIGHT = 20
```

`src/components/LaneHeaders.tsx` を全面書き換え:

```tsx
import type { Region } from '../data/schema'
import {
  AXIS_WIDTH,
  COLUMN_GAP,
  COLUMN_WIDTH,
  GROUP_HEADER_HEIGHT,
  HEADER_HEIGHT,
  LANE_PADDING,
} from './layout'

type LabelRun = {
  label: string
  startColumn: number
  span: number
}

function mergeLabelRuns(labels: (string | null)[]): LabelRun[] {
  const runs: LabelRun[] = []
  labels.forEach((label, column) => {
    if (label === null) return
    const last = runs[runs.length - 1]
    if (last && last.label === label && last.startColumn + last.span === column) {
      last.span += 1
      return
    }
    runs.push({ label, startColumn: column, span: 1 })
  })
  return runs
}

type Props = {
  regions: Region[]
  widths: number[]
  groupLabels: (string | null)[][]
  showGroupRow: boolean
}

export function LaneHeaders({ regions, widths, groupLabels, showGroupRow }: Props) {
  return (
    <div className="sticky top-0 z-20 w-max border-b border-line bg-panel">
      <div className="flex" role="row">
        <div className="sticky left-0 z-10 shrink-0 bg-panel" style={{ width: AXIS_WIDTH }} />
        {regions.map((region, i) => (
          <div
            key={region.id}
            role="columnheader"
            className="flex items-center justify-center text-sm font-medium"
            style={{
              width: widths[i],
              height: HEADER_HEIGHT,
              borderTop: `3px solid ${region.color}`,
            }}
          >
            {region.name}
          </div>
        ))}
      </div>
      {showGroupRow && (
        <div className="flex" role="row">
          <div className="sticky left-0 z-10 shrink-0 bg-panel" style={{ width: AXIS_WIDTH }} />
          {regions.map((region, i) => (
            <div
              key={region.id}
              className="relative"
              style={{ width: widths[i], height: GROUP_HEADER_HEIGHT }}
            >
              {mergeLabelRuns(groupLabels[i]).map((run) => (
                <div
                  key={run.startColumn}
                  className="absolute top-0 truncate text-center text-[10px] leading-5 text-muted"
                  style={{
                    left: LANE_PADDING + run.startColumn * (COLUMN_WIDTH + COLUMN_GAP),
                    width: run.span * COLUMN_WIDTH + (run.span - 1) * COLUMN_GAP,
                  }}
                >
                  {run.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: TimelinePage / TimelineView を接続**

`TimelinePage.tsx`:

```ts
import { columnGroupNames, packLane } from '../domain/packing'
```

```ts
  const groupLabels = useMemo(
    () => regions.map((r) => columnGroupNames(laneLayouts.get(r.id) ?? { columnCount: 1, positioned: [] })),
    [regions, laneLayouts],
  )
  const showGroupRow = maxImportance >= 2 && groupLabels.some((lane) => lane.some(Boolean))
  const headerHeightPx = HEADER_HEIGHT + (showGroupRow ? GROUP_HEADER_HEIGHT : 0)
```

`applyZoomAtContainerOffset` の `HEADER_HEIGHT` を `headerHeightPx` に置換（依存配列にも追加）。`TimelineView` に `groupLabels={groupLabels} showGroupRow={showGroupRow}` を渡し、`TimelineView` はそのまま `LaneHeaders` に渡す。

- [ ] **Step 6: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全 PASS

```bash
git add src/domain/packing.ts src/domain/packing.test.ts src/components/layout.ts src/components/LaneHeaders.tsx src/components/TimelineView.tsx src/components/TimelinePage.tsx src/components/TimelinePage.test.tsx
git commit -m "feat(lanes): sticky group-name header row when zoomed"
```

### Task 26: 画面端のスクロールフェード

**Files:**
- Create: `src/components/edgeFades.ts`
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/edgeFades.test.ts` / `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: スクロールコンテナの scroll イベント（既存 onScroll）
- Produces: `type EdgeFades = { top: boolean; bottom: boolean; left: boolean; right: boolean }` / `computeEdgeFades(metrics: ScrollMetrics): EdgeFades`

- [ ] **Step 1: 失敗する単体テストを書く**

`src/components/edgeFades.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { computeEdgeFades } from './edgeFades'

describe('computeEdgeFades', () => {
  const base = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 2000,
    scrollWidth: 1500,
    clientHeight: 800,
    clientWidth: 600,
  }

  test('先頭位置では下と右だけフェードを出す', () => {
    expect(computeEdgeFades(base)).toEqual({ top: false, bottom: true, left: false, right: true })
  })

  test('末尾位置では上と左だけフェードを出す', () => {
    expect(
      computeEdgeFades({ ...base, scrollTop: 1200, scrollLeft: 900 }),
    ).toEqual({ top: true, bottom: false, left: true, right: false })
  })

  test('スクロール余地が無い軸はフェードを出さない', () => {
    expect(
      computeEdgeFades({ ...base, scrollHeight: 800, scrollWidth: 600 }),
    ).toEqual({ top: false, bottom: false, left: false, right: false })
  })
})
```

Run: `pnpm vitest run src/components/edgeFades.test.ts`
Expected: FAIL

- [ ] **Step 2: 実装**

`src/components/edgeFades.ts`:

```ts
const EDGE_EPSILON_PX = 2

export type EdgeFades = {
  top: boolean
  bottom: boolean
  left: boolean
  right: boolean
}

type ScrollMetrics = {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
}

export function computeEdgeFades(metrics: ScrollMetrics): EdgeFades {
  return {
    top: metrics.scrollTop > EDGE_EPSILON_PX,
    bottom: metrics.scrollTop < metrics.scrollHeight - metrics.clientHeight - EDGE_EPSILON_PX,
    left: metrics.scrollLeft > EDGE_EPSILON_PX,
    right: metrics.scrollLeft < metrics.scrollWidth - metrics.clientWidth - EDGE_EPSILON_PX,
  }
}
```

- [ ] **Step 3: TimelinePage に組み込む**

```ts
import { computeEdgeFades, type EdgeFades } from './edgeFades'
```

```ts
  const [edgeFades, setEdgeFades] = useState<EdgeFades>({
    top: false,
    bottom: false,
    left: false,
    right: false,
  })
```

measure effect 内と `onScroll` ハンドラで更新する。`onScroll` を変更:

```tsx
        onScroll={(e) => {
          const el = e.currentTarget
          setZoom((prev) => (prev.scrollTop === el.scrollTop ? prev : { ...prev, scrollTop: el.scrollTop }))
          setEdgeFades(computeEdgeFades(el))
        }}
```

JSX（TimelineView の後）にフェードオーバーレイを追加:

```tsx
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-12 bottom-0 z-20">
        {edgeFades.top && (
          <div
            data-testid="fade-top"
            className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface to-transparent"
          />
        )}
        {edgeFades.bottom && (
          <div
            data-testid="fade-bottom"
            className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent"
          />
        )}
        {edgeFades.left && (
          <div
            data-testid="fade-left"
            className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface to-transparent"
          />
        )}
        {edgeFades.right && (
          <div
            data-testid="fade-right"
            className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface to-transparent"
          />
        )}
      </div>
```

- [ ] **Step 4: RTL テストを追加**

```tsx
test('スクロール残量のある方向に端フェードを表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const scroll = screen.getByTestId('timeline-scroll')
  Object.defineProperty(scroll, 'scrollHeight', { value: 3000, configurable: true })
  Object.defineProperty(scroll, 'scrollWidth', { value: 2000, configurable: true })
  Object.defineProperty(scroll, 'clientHeight', { value: 800, configurable: true })
  Object.defineProperty(scroll, 'clientWidth', { value: 600, configurable: true })
  fireEvent.scroll(scroll, { target: { scrollTop: 100 } })
  expect(screen.getByTestId('fade-top')).toBeInTheDocument()
  expect(screen.getByTestId('fade-bottom')).toBeInTheDocument()
  expect(screen.getByTestId('fade-right')).toBeInTheDocument()
  expect(screen.queryByTestId('fade-left')).not.toBeInTheDocument()
})
```

- [ ] **Step 5: 検証して Commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全 PASS

```bash
git add src/components/edgeFades.ts src/components/edgeFades.test.ts src/components/TimelinePage.tsx src/components/TimelinePage.test.tsx
git commit -m "feat(ui): edge fades hinting scrollable content"
```

### Task 27: PR⑤ 作成と最終検証

- [ ] **Step 1: PR を作成**

```bash
git push -u origin feat/onboarding
gh pr create --title "feat: オンボーディングと情報設計の改善" --body-file - <<'EOF'
## 概要

初見ユーザー向けの導入と、画面の情報設計を改善します。

## 変更内容

- 初回訪問時にウェルカムオーバーレイで基本操作（スクロール / ズーム / クリック / 検索)を紹介するようにしました。トップバーの ? からいつでも再表示できます
- ズームで国・王朝のカラムが表示されるレーンに、国名の2段目 sticky ヘッダーを追加しました
- スクロール残量のある画面端に淡いフェードを表示し、コンテンツの続きが分かるようにしました

## 確認方法

プレビュー URL で以下をご確認ください（初回表示の確認はシークレットウィンドウが便利です）。

- [ ] 初回アクセスでオーバーレイが表示され、「はじめる」後は再訪しても出ない
- [ ] ? ボタンで再表示できる
- [ ] ズームすると地域名の下に国名（イングランド等）が出る
- [ ] 右端・下端にフェードが出て、端に到達すると消える

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr checks --watch
```

- [ ] **Step 2: 全体の目視最終確認**

プレビュー URL で PR②〜⑤ の変更が揃った状態を確認する: 未来年なし / ラベル省略 / 重なりなし / 選択リング / ドラッグパン / かな検索 / オーバーレイ / 国名ヘッダー / 端フェード。モバイル幅（開発者ツールで 390px）でも崩れないことを確認する。

- [ ] **Step 3: マージ依頼**

ユーザーにレビュー・マージを依頼して完了。

---

## Self-Review チェック済み事項

- スペックの全要件にタスクが対応している（プレビュー環境=Task 4-5 / 設定=Task 1-3 / 年範囲=6-7 / ラベル=8-9 / トップバー=10 / パネル=11 / アンカー=12 / ズームボタン=13 / 初期ズーム=14 / 小画面=15 / cursor=16 / 選択色=17 / ドラッグ=18 / ホイール=19 / reading=20 / かな検索=21 / プレースホルダー=22 / キーボード=23 / オンボーディング=24 / 2段ヘッダー=25 / 端フェード=26）
- 型・シグネチャの整合: `YearRange` は Task 6 定義を 7 で使用。`wheelZoomFactor` は 19 定義。`columnGroupNames` は 25 内で定義・使用。`applyZoomAtContainerOffset` は 12 定義・19/25 で参照
- Task 19 が Task 12 のテスト期待値を、Task 25 が Task 12 の `HEADER_HEIGHT` 参照を更新することを本文に明記済み
