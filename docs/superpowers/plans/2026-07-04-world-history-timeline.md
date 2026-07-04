# 世界史タイムライン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 地域レーンを共通の縦時間軸に並べ、統治者・人物・事件の同時代性を一目で把握できる静的 Web 年表アプリを構築する。

**Architecture:** Vite + React + TypeScript の静的 SPA。年→座標変換・レーン内パッキングなどのロジックは `src/domain/` の純粋関数に分離し、SVG で描画する。データは `public/data/` の JSON を起動時に fetch し、zod スキーマ（アプリと検証スクリプトで共用）で parse する。

**Tech Stack:** Vite / React / TypeScript (strict) / SVG / zod / Tailwind CSS v4 / Biome / Vitest + React Testing Library / pnpm / GitHub Actions → Cloudflare Workers（静的アセット）

**Spec:** `docs/superpowers/specs/2026-07-04-world-history-timeline-design.md`

## Global Constraints

- パッケージ管理は pnpm、Node.js は 24（現行のアクティブ LTS）
- 依存パッケージは現時点の最新安定版を `pnpm add` で導入し、lockfile で固定する
- TypeScript は `strict: true`
- スタイリングは Tailwind CSS v4（`@tailwindcss/vite` プラグイン、トークンは `src/index.css` の `@theme`）。SVG 内のデータ由来の色・座標は inline 属性
- Lint / Format は Biome、テストは Vitest（環境 jsdom）+ React Testing Library
- デプロイ先は Cloudflare Workers の静的アセット（アセットのみの Worker）。デプロイ設定は `wrangler.jsonc` でリポジトリ管理し、ダッシュボードに設定を持たせない（Cloudflare 側は認証情報のみ）
- Vite の `base` はデフォルト（`/`）。データ fetch は `import.meta.env.BASE_URL` 経由のパスを使う
- 年は整数のみ（月日なし）。紀元前は負数（前300年 → `-300`）。表示は `formatYear` で「前300年」形式に変換
- UI 文言は日本語
- コードにコメントを書かない（ビジネスルール上の Why / 変更すると壊れる Warning のみ許可）
- コミットメッセージは英語で conventional commits に従い、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける
- データの正は `public/data/*.json`。エントリのスキーマ制約: `ruler` / `person` は `end` 必須、`event` のみ `end` 省略可（点イベント）、`group` を持つなら `groupName` 必須、`importance` は 1〜3

## File Structure

| パス | 責務 |
| --- | --- |
| `DESIGN.md` | ビジュアルアイデンティティ（design.md フォーマット: YAML トークン＋適用ガイド） |
| `design/previews/*.html` | コンポーネントプレビュー（Claude Design プロジェクトと同期） |
| `public/data/config.json` | 表示範囲（minYear / maxYear） |
| `public/data/regions.json` | レーン（地域）定義 |
| `public/data/entries.json` | 年表エントリ |
| `scripts/validate-data.ts` | データ検証 CLI（CI・ビルド前段で実行） |
| `src/data/schema.ts` | zod スキーマと型（アプリ・スクリプト共用） |
| `src/data/validate.ts` | データセット横断の整合性検証（純粋関数） |
| `src/data/load.ts` | fetch + parse |
| `src/domain/format.ts` | 年表示の整形（紀元前対応） |
| `src/domain/scale.ts` | 年 → Y 座標の線形変換 |
| `src/domain/ticks.ts` | 年目盛の間隔選択・生成 |
| `src/domain/packing.ts` | レーン内サブカラム配置（group パッキング） |
| `src/domain/visibility.ts` | importance 階層とビューポートカリング |
| `src/domain/query.ts` | 検索クエリ解釈・名前検索 |
| `src/domain/contemporaries.ts` | 同時代エントリの抽出 |
| `src/domain/zoom.ts` | ズームのクランプ・アンカー補正（純粋関数） |
| `src/components/layout.ts` | 描画レイアウト定数とレーン幅計算 |
| `src/components/TimelinePage.tsx` | 状態のオーケストレーション（ズーム・選択・検索） |
| `src/components/TimelineView.tsx` | スクロール容器と SVG 描画 |
| `src/components/LaneHeaders.tsx` | 地域名ヘッダー（上部 sticky） |
| `src/components/TimeAxis.tsx` | 年目盛（左端 sticky） |
| `src/components/EntryBar.tsx` | 期間エントリのバー |
| `src/components/EventMarker.tsx` | 点イベントのマーカー |
| `src/components/DetailPanel.tsx` | 詳細パネル（同時代リスト含む） |
| `src/components/SearchBar.tsx` | 名前検索＋年代ジャンプ |
| `src/components/ZoomControls.tsx` | ＋/−/全体表示ボタン |
| `src/components/ErrorBoundary.tsx` | 最上位のエラーフォールバック |
| `src/hooks/useTimelineData.ts` | データロード状態管理 |
| `src/test/setup.ts` | テストセットアップ（jest-dom） |
| `src/test/factory.ts` | テスト用エントリファクトリ |
| `src/test/fixtures.ts` | RTL 用データセットと fetch スタブ |
| `wrangler.jsonc` | Cloudflare Workers デプロイ設定 |
| `.github/workflows/ci.yml` | CI + Cloudflare Workers デプロイ |
| `README.md` | プロジェクト概要（英語） |
| `CLAUDE.md` | エージェント向け開発ガイド |

---

### Task 1: プロジェクトスキャフォールド

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: なし
- Produces: `App`（default export の React コンポーネント）、`pnpm dev` / `pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm build` の各スクリプト

- [ ] **Step 1: パッケージ初期化と依存追加**

```bash
pnpm init
pnpm add react react-dom zod
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @biomejs/biome tsx
```

- [ ] **Step 2: 設定ファイルを書く**

`package.json` に追記（`name` は `world-history-timeline`、`"type": "module"` を設定）:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome format --write ."
  }
}
```

`vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`biome.json` は `pnpm biome init` で生成した内容をそのまま使う（生成後 `pnpm lint` が通ることだけ確認）。

`.gitignore`:

```
node_modules
dist
```

- [ ] **Step 3: アプリの最小ファイルを書く**

`index.html`:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>世界史タイムライン</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:

```css
@import "tailwindcss";
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
```

`src/App.tsx`:

```tsx
export default function App() {
  return <h1 className="p-4 text-xl font-bold">世界史タイムライン</h1>
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: スモークテストを書く**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('タイトルを表示する', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: '世界史タイムライン' })).toBeInTheDocument()
})
```

- [ ] **Step 5: 全チェックを実行して確認**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: すべて成功。`pnpm test` は `1 passed`

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "chore: scaffold vite react typescript project with tailwind, biome, vitest"
```

---

### Task 2: データスキーマ（zod）

**Files:**
- Create: `src/data/schema.ts`
- Test: `src/data/schema.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `configSchema` / `regionSchema` / `regionsSchema` / `entrySchema` / `entriesSchema`（zod スキーマ）、型 `Config` / `Region` / `Entry` / `Dataset = { config: Config; regions: Region[]; entries: Entry[] }`

- [ ] **Step 1: 失敗するテストを書く**

`src/data/schema.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { configSchema, entrySchema, regionSchema } from './schema'

const validEntry = {
  id: 'edward-1',
  type: 'ruler',
  region: 'west-europe',
  group: 'england',
  groupName: 'イングランド',
  title: 'エドワード1世',
  start: 1272,
  end: 1307,
  importance: 2,
  description: 'ウェールズを征服し、模範議会を招集。',
}

describe('entrySchema', () => {
  test('正常なエントリを受理する', () => {
    expect(entrySchema.parse(validEntry)).toEqual(validEntry)
  })

  test('end のない event を点イベントとして受理する', () => {
    const event = { ...validEntry, id: 'anagni', type: 'event', end: undefined }
    expect(entrySchema.parse(event).end).toBeUndefined()
  })

  test('end のない ruler を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, end: undefined })).toThrow()
  })

  test('end < start を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, end: 1271 })).toThrow()
  })

  test('groupName のない group を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, groupName: undefined })).toThrow()
  })

  test('importance の範囲外を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, importance: 4 })).toThrow()
  })

  test('小数の年を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, start: 1272.5 })).toThrow()
  })
})

describe('regionSchema', () => {
  test('正常な地域を受理する', () => {
    const region = { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' }
    expect(regionSchema.parse(region)).toEqual(region)
  })

  test('不正な色形式を拒否する', () => {
    expect(() => regionSchema.parse({ id: 'a', name: 'あ', order: 1, color: 'blue' })).toThrow()
  })
})

describe('configSchema', () => {
  test('minYear >= maxYear を拒否する', () => {
    expect(() => configSchema.parse({ minYear: 2100, maxYear: -3000 })).toThrow()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/data/schema.test.ts`
Expected: FAIL（`./schema` が存在しない）

- [ ] **Step 3: スキーマを実装する**

`src/data/schema.ts`:

```ts
import { z } from 'zod'

export const configSchema = z
  .object({
    minYear: z.number().int(),
    maxYear: z.number().int(),
  })
  .refine(c => c.minYear < c.maxYear, { message: 'minYear must be less than maxYear' })

export const regionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

export const entrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(['ruler', 'person', 'event']),
    region: z.string().min(1),
    group: z.string().min(1).optional(),
    groupName: z.string().min(1).optional(),
    title: z.string().min(1),
    start: z.number().int(),
    end: z.number().int().optional(),
    importance: z.number().int().min(1).max(3),
    description: z.string().min(1),
  })
  .superRefine((e, ctx) => {
    if (e.type !== 'event' && e.end === undefined) {
      ctx.addIssue({ code: 'custom', message: `${e.id}: ruler/person requires end` })
    }
    if (e.end !== undefined && e.end < e.start) {
      ctx.addIssue({ code: 'custom', message: `${e.id}: end must be >= start` })
    }
    if (e.group !== undefined && e.groupName === undefined) {
      ctx.addIssue({ code: 'custom', message: `${e.id}: group requires groupName` })
    }
  })

export const regionsSchema = z.array(regionSchema)
export const entriesSchema = z.array(entrySchema)

export type Config = z.infer<typeof configSchema>
export type Region = z.infer<typeof regionSchema>
export type Entry = z.infer<typeof entrySchema>

export type Dataset = {
  config: Config
  regions: Region[]
  entries: Entry[]
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/data/schema.test.ts`
Expected: PASS（10 tests）

- [ ] **Step 5: コミット**

```bash
git add src/data/schema.ts src/data/schema.test.ts
git commit -m "feat: add zod schemas for timeline dataset"
```

---

### Task 3: 横断検証・シードデータ・検証スクリプト

**Files:**
- Create: `src/data/validate.ts`, `public/data/config.json`, `public/data/regions.json`, `public/data/entries.json`, `scripts/validate-data.ts`
- Modify: `package.json`（scripts）
- Test: `src/data/validate.test.ts`

**Interfaces:**
- Consumes: `Dataset` / 各スキーマ（Task 2）
- Produces: `validateDataset(dataset: Dataset): string[]`（違反メッセージの配列、空なら正常）、`pnpm validate-data`、シードデータ（8地域・15エントリ）

- [ ] **Step 1: 失敗するテストを書く**

`src/data/validate.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { configSchema, entriesSchema, regionsSchema, type Dataset } from './schema'
import { validateDataset } from './validate'

const config = { minYear: -3000, maxYear: 2100 }
const regions = [{ id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' }]
const entry = {
  id: 'edward-1',
  type: 'ruler' as const,
  region: 'west-europe',
  title: 'エドワード1世',
  start: 1272,
  end: 1307,
  importance: 2,
  description: 'ウェールズを征服。',
}

describe('validateDataset', () => {
  test('正常なデータセットはエラーなし', () => {
    expect(validateDataset({ config, regions, entries: [entry] })).toEqual([])
  })

  test('id 重複を検出する', () => {
    const errors = validateDataset({ config, regions, entries: [entry, { ...entry }] })
    expect(errors).toEqual([expect.stringContaining('duplicate id')])
  })

  test('存在しない地域参照を検出する', () => {
    const errors = validateDataset({ config, regions, entries: [{ ...entry, region: 'mars' }] })
    expect(errors).toEqual([expect.stringContaining('unknown region')])
  })

  test('表示範囲外の年を検出する', () => {
    const errors = validateDataset({ config, regions, entries: [{ ...entry, start: -4000 }] })
    expect(errors).toEqual([expect.stringContaining('out of range')])
  })
})

describe('public/data', () => {
  test('実データがスキーマと横断検証を通過する', () => {
    const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf-8'))
    const dataset: Dataset = {
      config: configSchema.parse(read('config.json')),
      regions: regionsSchema.parse(read('regions.json')),
      entries: entriesSchema.parse(read('entries.json')),
    }
    expect(validateDataset(dataset)).toEqual([])
    expect(dataset.regions).toHaveLength(8)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/data/validate.test.ts`
Expected: FAIL（`./validate` が存在しない）

- [ ] **Step 3: validateDataset を実装する**

`src/data/validate.ts`:

```ts
import type { Dataset } from './schema'

export function validateDataset({ config, regions, entries }: Dataset): string[] {
  const errors: string[] = []
  const regionIds = new Set(regions.map(r => r.id))
  const seen = new Set<string>()
  for (const e of entries) {
    if (seen.has(e.id)) errors.push(`duplicate id: ${e.id}`)
    seen.add(e.id)
    if (!regionIds.has(e.region)) errors.push(`${e.id}: unknown region ${e.region}`)
    if (e.start < config.minYear || (e.end ?? e.start) > config.maxYear) {
      errors.push(`${e.id}: out of range`)
    }
  }
  return errors
}
```

- [ ] **Step 4: シードデータを書く**

`public/data/config.json`:

```json
{ "minYear": -3000, "maxYear": 2100 }
```

`public/data/regions.json`:

```json
[
  { "id": "west-europe", "name": "西欧", "order": 1, "color": "#4a90d9" },
  { "id": "east-europe", "name": "東欧・ロシア", "order": 2, "color": "#7b6bd9" },
  { "id": "middle-east", "name": "中東・北アフリカ", "order": 3, "color": "#d98f4a" },
  { "id": "central-eurasia", "name": "中央ユーラシア", "order": 4, "color": "#b0813f" },
  { "id": "south-asia", "name": "南アジア", "order": 5, "color": "#d94a6b" },
  { "id": "east-asia", "name": "東アジア", "order": 6, "color": "#3fa06b" },
  { "id": "japan", "name": "日本", "order": 7, "color": "#d94a4a" },
  { "id": "americas", "name": "アメリカ大陸", "order": 8, "color": "#8a8f4a" }
]
```

`public/data/entries.json`（モチーフである13世紀末〜14世紀初頭を中心に、古代・近代の範囲確認用を含む15件）:

```json
[
  { "id": "alexander-3", "type": "ruler", "region": "east-europe", "group": "macedonia", "groupName": "マケドニア", "title": "アレクサンドロス大王", "start": -336, "end": -323, "importance": 1, "description": "東方遠征でアケメネス朝を滅ぼし、ギリシアからインダス川に至る大帝国を築いた。" },
  { "id": "genghis-khan", "type": "ruler", "region": "central-eurasia", "group": "mongol", "groupName": "モンゴル帝国", "title": "チンギス・ハン", "start": 1206, "end": 1227, "importance": 1, "description": "モンゴル諸部族を統一し、ユーラシアにまたがる大帝国の基礎を築いた。" },
  { "id": "mongol-empire-founding", "type": "event", "region": "central-eurasia", "title": "モンゴル帝国成立", "start": 1206, "importance": 1, "description": "クリルタイでテムジンがチンギス・ハンとして即位した。" },
  { "id": "henry-3-england", "type": "ruler", "region": "west-europe", "group": "england", "groupName": "イングランド", "title": "ヘンリ3世", "start": 1216, "end": 1272, "importance": 3, "description": "在位中にシモン・ド・モンフォールの乱が起こり、議会の起源が生まれた。" },
  { "id": "edward-1", "type": "ruler", "region": "west-europe", "group": "england", "groupName": "イングランド", "title": "エドワード1世", "start": 1272, "end": 1307, "importance": 2, "description": "ウェールズを征服し、模範議会を招集。スコットランド遠征中に病没。" },
  { "id": "philippe-4", "type": "ruler", "region": "west-europe", "group": "france", "groupName": "フランス", "title": "フィリップ4世", "start": 1285, "end": 1314, "importance": 1, "description": "三部会を初招集し、教皇ボニファティウス8世と争った。アナーニ事件・教皇のバビロン捕囚を引き起こす。" },
  { "id": "boniface-8", "type": "ruler", "region": "west-europe", "group": "papacy", "groupName": "ローマ教皇", "title": "ボニファティウス8世", "start": 1294, "end": 1303, "importance": 2, "description": "教皇権の絶頂を主張したがフィリップ4世と衝突し、アナーニ事件で憤死した。" },
  { "id": "anagni", "type": "event", "region": "west-europe", "title": "アナーニ事件", "start": 1303, "importance": 2, "description": "フィリップ4世がボニファティウス8世をアナーニで捕縛した事件。" },
  { "id": "andronikos-2", "type": "ruler", "region": "east-europe", "group": "byzantine", "groupName": "ビザンツ帝国", "title": "アンドロニコス2世", "start": 1282, "end": 1328, "importance": 3, "description": "衰退期のビザンツ皇帝。オスマン勢力の台頭に直面した。" },
  { "id": "ghazan-khan", "type": "ruler", "region": "middle-east", "group": "ilkhanate", "groupName": "イルハン朝", "title": "ガザン・ハン", "start": 1295, "end": 1304, "importance": 2, "description": "イルハン朝の君主。イスラームに改宗し、ラシード・アッディーンに『集史』を編纂させた。" },
  { "id": "alauddin-khalji", "type": "ruler", "region": "south-asia", "group": "delhi-sultanate", "groupName": "デリー・スルタン朝", "title": "アラーウッディーン・ハルジー", "start": 1296, "end": 1316, "importance": 2, "description": "ハルジー朝の最盛期を築き、モンゴル軍の侵入を撃退した。" },
  { "id": "kublai-khan", "type": "ruler", "region": "east-asia", "group": "yuan", "groupName": "元", "title": "フビライ・ハン", "start": 1260, "end": 1294, "importance": 1, "description": "大都に遷都し国号を元とした。南宋を滅ぼし、日本へ二度遠征軍を送った。" },
  { "id": "marco-polo", "type": "person", "region": "east-asia", "title": "マルコ・ポーロ", "start": 1271, "end": 1295, "importance": 2, "description": "ヴェネツィア出身。元のフビライに仕え、帰国後『世界の記述（東方見聞録）』を口述した。" },
  { "id": "hojo-tokimune", "type": "ruler", "region": "japan", "group": "kamakura", "groupName": "鎌倉幕府", "title": "北条時宗", "start": 1268, "end": 1284, "importance": 2, "description": "鎌倉幕府8代執権。二度の元寇（文永・弘安の役）を退けた。" },
  { "id": "tenochtitlan", "type": "event", "region": "americas", "title": "テノチティトラン建設", "start": 1325, "importance": 2, "description": "アステカ人がテスココ湖上に都を建設した。" }
]
```

- [ ] **Step 5: 検証スクリプトを書く**

`scripts/validate-data.ts`:

```ts
import { readFileSync } from 'node:fs'
import { configSchema, entriesSchema, regionsSchema } from '../src/data/schema'
import { validateDataset } from '../src/data/validate'

const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf-8'))

const dataset = {
  config: configSchema.parse(read('config.json')),
  regions: regionsSchema.parse(read('regions.json')),
  entries: entriesSchema.parse(read('entries.json')),
}
const errors = validateDataset(dataset)
if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`OK: ${dataset.regions.length} regions, ${dataset.entries.length} entries`)
```

`package.json` の scripts を修正（`validate-data` を追加し、`build` の前段に組み込む）:

```json
{
  "scripts": {
    "build": "pnpm validate-data && tsc --noEmit && vite build",
    "validate-data": "tsx scripts/validate-data.ts"
  }
}
```

- [ ] **Step 6: テストとスクリプトが通ることを確認**

Run: `pnpm vitest run src/data/validate.test.ts && pnpm validate-data`
Expected: テスト PASS（5 tests）、スクリプトは `OK: 8 regions, 15 entries`

- [ ] **Step 7: コミット**

```bash
git add src/data/validate.ts src/data/validate.test.ts public/data scripts/validate-data.ts package.json
git commit -m "feat: add dataset cross-validation, seed data, and validate-data script"
```

---

### Task 4: 年表示の整形（domain/format）

**Files:**
- Create: `src/domain/format.ts`
- Test: `src/domain/format.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `formatYear(year: number): string`、`formatSpan(start: number, end?: number): string`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/format.test.ts`:

```ts
import { expect, test } from 'vitest'
import { formatSpan, formatYear } from './format'

test('西暦年を「1300年」形式にする', () => {
  expect(formatYear(1300)).toBe('1300年')
})

test('負数を「前300年」形式にする', () => {
  expect(formatYear(-300)).toBe('前300年')
})

test('期間を「〜」で結合する', () => {
  expect(formatSpan(1272, 1307)).toBe('1272年〜1307年')
})

test('end がなければ単年表示', () => {
  expect(formatSpan(1303)).toBe('1303年')
})

test('紀元前をまたぐ期間', () => {
  expect(formatSpan(-27, 14)).toBe('前27年〜14年')
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/format.test.ts`
Expected: FAIL（`./format` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/format.ts`:

```ts
export function formatYear(year: number): string {
  return year < 0 ? `前${-year}年` : `${year}年`
}

export function formatSpan(start: number, end?: number): string {
  return end === undefined ? formatYear(start) : `${formatYear(start)}〜${formatYear(end)}`
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/format.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/format.ts src/domain/format.test.ts
git commit -m "feat: add year formatting with BC support"
```

---

### Task 5: 年 → 座標スケール（domain/scale）

**Files:**
- Create: `src/domain/scale.ts`
- Test: `src/domain/scale.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `type Scale = { pxPerYear: number; totalHeight: number; yearToY: (year: number) => number; yToYear: (y: number) => number }`、`createScale(minYear: number, maxYear: number, pxPerYear: number): Scale`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/scale.test.ts`:

```ts
import { expect, test } from 'vitest'
import { createScale } from './scale'

test('minYear が Y=0 になる', () => {
  const scale = createScale(-3000, 2100, 2)
  expect(scale.yearToY(-3000)).toBe(0)
})

test('年差 × pxPerYear が Y 座標になる', () => {
  const scale = createScale(-3000, 2100, 2)
  expect(scale.yearToY(1300)).toBe(4300 * 2)
})

test('totalHeight は全期間の高さ', () => {
  const scale = createScale(-3000, 2100, 0.5)
  expect(scale.totalHeight).toBe(5100 * 0.5)
})

test('yToYear は yearToY の逆変換', () => {
  const scale = createScale(-3000, 2100, 1.5)
  expect(scale.yToYear(scale.yearToY(476))).toBeCloseTo(476)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/scale.test.ts`
Expected: FAIL（`./scale` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/scale.ts`:

```ts
export type Scale = {
  pxPerYear: number
  totalHeight: number
  yearToY: (year: number) => number
  yToYear: (y: number) => number
}

export function createScale(minYear: number, maxYear: number, pxPerYear: number): Scale {
  return {
    pxPerYear,
    totalHeight: (maxYear - minYear) * pxPerYear,
    yearToY: year => (year - minYear) * pxPerYear,
    yToYear: y => minYear + y / pxPerYear,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/scale.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/scale.ts src/domain/scale.test.ts
git commit -m "feat: add year-to-pixel linear scale"
```

---

### Task 6: 年目盛（domain/ticks）

**Files:**
- Create: `src/domain/ticks.ts`
- Test: `src/domain/ticks.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `tickInterval(pxPerYear: number): number`（10 / 50 / 100 / 500 のいずれか）、`generateTicks(minYear: number, maxYear: number, interval: number): number[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/ticks.test.ts`:

```ts
import { expect, test } from 'vitest'
import { generateTicks, tickInterval } from './ticks'

test('十分に寄っていれば10年間隔', () => {
  expect(tickInterval(8)).toBe(10)
})

test('中間ズームでは50年間隔', () => {
  expect(tickInterval(1.2)).toBe(50)
})

test('浅いズームでは100年間隔', () => {
  expect(tickInterval(0.6)).toBe(100)
})

test('引き切ると500年間隔', () => {
  expect(tickInterval(0.05)).toBe(500)
})

test('間隔の倍数だけを範囲内に生成する', () => {
  expect(generateTicks(-120, 260, 100)).toEqual([-100, 0, 100, 200])
})

test('境界の年も含む', () => {
  expect(generateTicks(1200, 1400, 100)).toEqual([1200, 1300, 1400])
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/ticks.test.ts`
Expected: FAIL（`./ticks` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/ticks.ts`:

```ts
const INTERVALS = [10, 50, 100, 500]
const MIN_TICK_SPACING_PX = 48

export function tickInterval(pxPerYear: number): number {
  return INTERVALS.find(interval => interval * pxPerYear >= MIN_TICK_SPACING_PX) ?? 500
}

export function generateTicks(minYear: number, maxYear: number, interval: number): number[] {
  const ticks: number[] = []
  for (let year = Math.ceil(minYear / interval) * interval; year <= maxYear; year += interval) {
    ticks.push(year)
  }
  return ticks
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/ticks.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/ticks.ts src/domain/ticks.test.ts
git commit -m "feat: add adaptive tick interval selection"
```

---

### Task 7: レーン内パッキング（domain/packing）

**Files:**
- Create: `src/domain/packing.ts`, `src/test/factory.ts`
- Test: `src/domain/packing.test.ts`

**Interfaces:**
- Consumes: `Entry`（Task 2）
- Produces: `type PositionedEntry = { entry: Entry; column: number }`、`type LaneLayout = { columnCount: number; positioned: PositionedEntry[] }`、`packLane(entries: Entry[]): LaneLayout`、テスト用 `makeEntry(over: Partial<Entry> & { id: string }): Entry`

- [ ] **Step 1: テスト用ファクトリを書く**

`src/test/factory.ts`:

```ts
import type { Entry } from '../data/schema'

export function makeEntry(over: Partial<Entry> & { id: string }): Entry {
  return {
    type: 'ruler',
    region: 'west-europe',
    title: over.id,
    start: 1000,
    end: 1050,
    importance: 1,
    description: 'テスト用エントリ。',
    ...over,
  }
}
```

- [ ] **Step 2: 失敗するテストを書く**

`src/domain/packing.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { packLane } from './packing'

function columnOf(layout: ReturnType<typeof packLane>, id: string): number {
  const found = layout.positioned.find(p => p.entry.id === id)
  if (!found) throw new Error(`entry not found: ${id}`)
  return found.column
}

describe('packLane', () => {
  test('空レーンは幅1', () => {
    expect(packLane([])).toEqual({ columnCount: 1, positioned: [] })
  })

  test('同じ group の連続する在位は同じカラムに積まれる', () => {
    const layout = packLane([
      makeEntry({ id: 'henry-3', group: 'england', groupName: 'e', start: 1216, end: 1272 }),
      makeEntry({ id: 'edward-1', group: 'england', groupName: 'e', start: 1272, end: 1307 }),
    ])
    expect(layout.columnCount).toBe(1)
    expect(columnOf(layout, 'henry-3')).toBe(columnOf(layout, 'edward-1'))
  })

  test('期間が重なる別 group は別カラムになる', () => {
    const layout = packLane([
      makeEntry({ id: 'edward-1', group: 'england', groupName: 'e', start: 1272, end: 1307 }),
      makeEntry({ id: 'philippe-4', group: 'france', groupName: 'f', start: 1285, end: 1314 }),
    ])
    expect(layout.columnCount).toBe(2)
    expect(columnOf(layout, 'edward-1')).not.toBe(columnOf(layout, 'philippe-4'))
  })

  test('時代が重ならない group はカラムを共有する', () => {
    const layout = packLane([
      makeEntry({ id: 'augustus', group: 'rome', groupName: 'r', start: -27, end: 14 }),
      makeEntry({ id: 'alfred', group: 'england', groupName: 'e', start: 871, end: 899 }),
    ])
    expect(layout.columnCount).toBe(1)
  })

  test('group 内で期間が重なると group が内部で複数カラムに分かれる', () => {
    const layout = packLane([
      makeEntry({ id: 'co-a', group: 'byz', groupName: 'b', start: 1300, end: 1340 }),
      makeEntry({ id: 'co-b', group: 'byz', groupName: 'b', start: 1320, end: 1350 }),
    ])
    expect(layout.columnCount).toBe(2)
    expect(columnOf(layout, 'co-a')).not.toBe(columnOf(layout, 'co-b'))
  })

  test('group なしのエントリは単独グループとして扱う', () => {
    const layout = packLane([
      makeEntry({ id: 'marco-polo', type: 'person', start: 1271, end: 1295 }),
      makeEntry({ id: 'kublai', group: 'yuan', groupName: 'y', start: 1260, end: 1294 }),
    ])
    expect(layout.columnCount).toBe(2)
  })

  test('点イベントは start のみの区間として扱う', () => {
    const layout = packLane([
      makeEntry({ id: 'anagni', type: 'event', start: 1303, end: undefined }),
      makeEntry({ id: 'lyon', type: 'event', start: 1305, end: undefined }),
    ])
    expect(layout.columnCount).toBe(1)
  })

  test('入力順に依存せず決定的である', () => {
    const entries = [
      makeEntry({ id: 'a', group: 'g1', groupName: 'g', start: 1200, end: 1260 }),
      makeEntry({ id: 'b', group: 'g2', groupName: 'g', start: 1250, end: 1300 }),
      makeEntry({ id: 'c', group: 'g3', groupName: 'g', start: 1290, end: 1350 }),
    ]
    const forward = packLane(entries)
    const reversed = packLane([...entries].reverse())
    expect(forward.columnCount).toBe(reversed.columnCount)
    for (const p of forward.positioned) {
      expect(columnOf(reversed, p.entry.id)).toBe(p.column)
    }
  })
})
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/packing.test.ts`
Expected: FAIL（`./packing` が存在しない）

- [ ] **Step 4: 実装する**

`src/domain/packing.ts`:

```ts
import type { Entry } from '../data/schema'

export type PositionedEntry = {
  entry: Entry
  column: number
}

export type LaneLayout = {
  columnCount: number
  positioned: PositionedEntry[]
}

const endOf = (e: Entry) => e.end ?? e.start

function packIntervals(intervals: { start: number; end: number }[]): {
  columnCount: number
  columns: number[]
} {
  const ends: number[] = []
  const columns = intervals.map(({ start, end }) => {
    const found = ends.findIndex(e => e <= start)
    const column = found === -1 ? ends.length : found
    ends[column] = end
    return column
  })
  return { columnCount: Math.max(ends.length, 1), columns }
}

function findSlot(columnEnds: number[], start: number, width: number): number {
  for (let base = 0; base <= columnEnds.length; base++) {
    let free = true
    for (let i = 0; i < width; i++) {
      const end = columnEnds[base + i]
      if (end !== undefined && end > start) {
        free = false
        break
      }
    }
    if (free) return base
  }
  return columnEnds.length
}

export function packLane(entries: Entry[]): LaneLayout {
  const byGroup = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = e.group ?? `solo:${e.id}`
    const members = byGroup.get(key)
    if (members) members.push(e)
    else byGroup.set(key, [e])
  }

  const groups = [...byGroup.entries()]
    .map(([key, members]) => {
      const sorted = [...members].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
      const inner = packIntervals(sorted.map(e => ({ start: e.start, end: endOf(e) })))
      return {
        key,
        start: Math.min(...sorted.map(e => e.start)),
        end: Math.max(...sorted.map(endOf)),
        width: inner.columnCount,
        innerColumns: inner.columns,
        members: sorted,
      }
    })
    .sort((a, b) => a.start - b.start || a.key.localeCompare(b.key))

  const columnEnds: number[] = []
  const positioned: PositionedEntry[] = []
  for (const group of groups) {
    const base = findSlot(columnEnds, group.start, group.width)
    for (let i = 0; i < group.width; i++) {
      columnEnds[base + i] = Math.max(columnEnds[base + i] ?? Number.NEGATIVE_INFINITY, group.end)
    }
    group.members.forEach((entry, i) => {
      positioned.push({ entry, column: base + group.innerColumns[i] })
    })
  }
  return { columnCount: Math.max(columnEnds.length, 1), positioned }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `pnpm vitest run src/domain/packing.test.ts`
Expected: PASS（8 tests）

- [ ] **Step 6: コミット**

```bash
git add src/domain/packing.ts src/domain/packing.test.ts src/test/factory.ts
git commit -m "feat: add greedy group packing for lane sub-columns"
```

---

### Task 8: importance 階層とカリング（domain/visibility）

**Files:**
- Create: `src/domain/visibility.ts`
- Test: `src/domain/visibility.test.ts`

**Interfaces:**
- Consumes: `Entry`（Task 2）、`makeEntry`（Task 7）
- Produces: `TIER2_MIN_PX_PER_YEAR = 1` / `TIER3_MIN_PX_PER_YEAR = 4`（調整可能な定数）、`maxVisibleImportance(pxPerYear: number): 1 | 2 | 3`、`visibleEntries(entries: Entry[], topYear: number, bottomYear: number, maxImportance: number): Entry[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/visibility.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { maxVisibleImportance, visibleEntries } from './visibility'

describe('maxVisibleImportance', () => {
  test('引きでは importance 1 のみ', () => {
    expect(maxVisibleImportance(0.3)).toBe(1)
  })

  test('中間ズームでは importance 2 まで', () => {
    expect(maxVisibleImportance(2)).toBe(2)
  })

  test('寄りでは importance 3 まで', () => {
    expect(maxVisibleImportance(8)).toBe(3)
  })
})

describe('visibleEntries', () => {
  const entries = [
    makeEntry({ id: 'in-range', start: 1200, end: 1250, importance: 1 }),
    makeEntry({ id: 'overlapping-top', start: 1050, end: 1120, importance: 1 }),
    makeEntry({ id: 'before-range', start: 800, end: 900, importance: 1 }),
    makeEntry({ id: 'too-detailed', start: 1200, end: 1250, importance: 3 }),
    makeEntry({ id: 'point-in-range', type: 'event', start: 1210, end: undefined, importance: 1 }),
  ]

  test('範囲と交差し importance 条件を満たすものだけ返す', () => {
    const visible = visibleEntries(entries, 1100, 1300, 2).map(e => e.id)
    expect(visible).toEqual(['in-range', 'overlapping-top', 'point-in-range'])
  })

  test('maxImportance を上げると詳細エントリも含む', () => {
    const visible = visibleEntries(entries, 1100, 1300, 3).map(e => e.id)
    expect(visible).toContain('too-detailed')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/visibility.test.ts`
Expected: FAIL（`./visibility` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/visibility.ts`:

```ts
import type { Entry } from '../data/schema'

export const TIER2_MIN_PX_PER_YEAR = 1
export const TIER3_MIN_PX_PER_YEAR = 4

export function maxVisibleImportance(pxPerYear: number): 1 | 2 | 3 {
  if (pxPerYear >= TIER3_MIN_PX_PER_YEAR) return 3
  if (pxPerYear >= TIER2_MIN_PX_PER_YEAR) return 2
  return 1
}

export function visibleEntries(
  entries: Entry[],
  topYear: number,
  bottomYear: number,
  maxImportance: number,
): Entry[] {
  return entries.filter(
    e => e.importance <= maxImportance && e.start <= bottomYear && (e.end ?? e.start) >= topYear,
  )
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/visibility.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/visibility.ts src/domain/visibility.test.ts
git commit -m "feat: add importance tiers and viewport culling"
```

---

### Task 9: 検索クエリ解釈（domain/query）

**Files:**
- Create: `src/domain/query.ts`
- Test: `src/domain/query.test.ts`

**Interfaces:**
- Consumes: `Entry`（Task 2）、`makeEntry`（Task 7）
- Produces: `type Query = { kind: 'empty' } | { kind: 'year'; year: number } | { kind: 'name'; text: string }`、`parseQuery(input: string): Query`、`searchEntries(entries: Entry[], text: string, limit?: number): Entry[]`（limit デフォルト 8）

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/query.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { parseQuery, searchEntries } from './query'

describe('parseQuery', () => {
  test('空文字は empty', () => {
    expect(parseQuery('  ')).toEqual({ kind: 'empty' })
  })

  test('数字は西暦年', () => {
    expect(parseQuery('1300')).toEqual({ kind: 'year', year: 1300 })
  })

  test('「1300年」の形式も西暦年', () => {
    expect(parseQuery('1300年')).toEqual({ kind: 'year', year: 1300 })
  })

  test('「前300」は紀元前', () => {
    expect(parseQuery('前300')).toEqual({ kind: 'year', year: -300 })
  })

  test('それ以外は名前検索', () => {
    expect(parseQuery('エドワード')).toEqual({ kind: 'name', text: 'エドワード' })
  })
})

describe('searchEntries', () => {
  const entries = [
    makeEntry({ id: 'edward-1', title: 'エドワード1世', importance: 2, start: 1272 }),
    makeEntry({ id: 'edward-2', title: 'エドワード2世', importance: 3, start: 1307 }),
    makeEntry({ id: 'philippe-4', title: 'フィリップ4世', importance: 1, start: 1285 }),
  ]

  test('タイトル部分一致で絞り込む', () => {
    expect(searchEntries(entries, 'エドワード').map(e => e.id)).toEqual(['edward-1', 'edward-2'])
  })

  test('importance 順・開始年順に並べる', () => {
    expect(searchEntries(entries, '世').map(e => e.id)).toEqual([
      'philippe-4',
      'edward-1',
      'edward-2',
    ])
  })

  test('limit で件数を制限する', () => {
    expect(searchEntries(entries, '世', 1)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/query.test.ts`
Expected: FAIL（`./query` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/query.ts`:

```ts
import type { Entry } from '../data/schema'

export type Query =
  | { kind: 'empty' }
  | { kind: 'year'; year: number }
  | { kind: 'name'; text: string }

export function parseQuery(input: string): Query {
  const text = input.trim()
  if (text === '') return { kind: 'empty' }
  const ad = text.match(/^(\d{1,4})年?$/)
  if (ad) return { kind: 'year', year: Number(ad[1]) }
  const bc = text.match(/^前(\d{1,4})年?$/)
  if (bc) return { kind: 'year', year: -Number(bc[1]) }
  return { kind: 'name', text }
}

export function searchEntries(entries: Entry[], text: string, limit = 8): Entry[] {
  return entries
    .filter(e => e.title.includes(text))
    .sort((a, b) => a.importance - b.importance || a.start - b.start)
    .slice(0, limit)
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/query.test.ts`
Expected: PASS（8 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/query.ts src/domain/query.test.ts
git commit -m "feat: add search query parsing and name search"
```

---

### Task 10: 同時代エントリ抽出（domain/contemporaries）

**Files:**
- Create: `src/domain/contemporaries.ts`
- Test: `src/domain/contemporaries.test.ts`

**Interfaces:**
- Consumes: `Entry` / `Region`（Task 2）、`makeEntry`（Task 7）
- Produces: `findContemporaries(selected: Entry, entries: Entry[], regions: Region[], limit?: number): Entry[]`（limit デフォルト 10。選択エントリと期間が交差する、他地域・importance 2 以下のエントリを地域順→開始年順で返す）

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/contemporaries.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import type { Region } from '../data/schema'
import { makeEntry } from '../test/factory'
import { findContemporaries } from './contemporaries'

const regions: Region[] = [
  { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' },
  { id: 'east-asia', name: '東アジア', order: 6, color: '#3fa06b' },
  { id: 'japan', name: '日本', order: 7, color: '#d94a4a' },
]

const edward = makeEntry({ id: 'edward-1', region: 'west-europe', start: 1272, end: 1307 })

describe('findContemporaries', () => {
  test('期間が交差する他地域のエントリを地域順で返す', () => {
    const entries = [
      edward,
      makeEntry({ id: 'tokimune', region: 'japan', start: 1268, end: 1284 }),
      makeEntry({ id: 'kublai', region: 'east-asia', start: 1260, end: 1294 }),
    ]
    expect(findContemporaries(edward, entries, regions).map(e => e.id)).toEqual([
      'kublai',
      'tokimune',
    ])
  })

  test('自分自身と同地域のエントリは除く', () => {
    const entries = [
      edward,
      makeEntry({ id: 'philippe-4', region: 'west-europe', start: 1285, end: 1314 }),
    ]
    expect(findContemporaries(edward, entries, regions)).toEqual([])
  })

  test('期間が交差しないエントリは除く', () => {
    const entries = [edward, makeEntry({ id: 'meiji', region: 'japan', start: 1868, end: 1912 })]
    expect(findContemporaries(edward, entries, regions)).toEqual([])
  })

  test('importance 3 は除く', () => {
    const entries = [
      edward,
      makeEntry({ id: 'minor', region: 'japan', start: 1272, end: 1307, importance: 3 }),
    ]
    expect(findContemporaries(edward, entries, regions)).toEqual([])
  })

  test('点イベントはその年で交差判定する', () => {
    const anagni = makeEntry({ id: 'anagni', type: 'event', region: 'west-europe', start: 1303, end: undefined })
    const entries = [
      anagni,
      makeEntry({ id: 'khalji', region: 'east-asia', start: 1296, end: 1316 }),
      makeEntry({ id: 'tokimune', region: 'japan', start: 1268, end: 1284 }),
    ]
    expect(findContemporaries(anagni, entries, regions).map(e => e.id)).toEqual(['khalji'])
  })

  test('limit で件数を制限する', () => {
    const entries = [
      edward,
      ...Array.from({ length: 15 }, (_, i) =>
        makeEntry({ id: `east-${String(i).padStart(2, '0')}`, region: 'east-asia', start: 1272, end: 1307 }),
      ),
    ]
    expect(findContemporaries(edward, entries, regions)).toHaveLength(10)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/contemporaries.test.ts`
Expected: FAIL（`./contemporaries` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/contemporaries.ts`:

```ts
import type { Entry, Region } from '../data/schema'

export function findContemporaries(
  selected: Entry,
  entries: Entry[],
  regions: Region[],
  limit = 10,
): Entry[] {
  const regionOrder = new Map(regions.map(r => [r.id, r.order]))
  const start = selected.start
  const end = selected.end ?? selected.start
  return entries
    .filter(
      e =>
        e.id !== selected.id &&
        e.region !== selected.region &&
        e.importance <= 2 &&
        e.start <= end &&
        (e.end ?? e.start) >= start,
    )
    .sort(
      (a, b) =>
        (regionOrder.get(a.region) ?? 0) - (regionOrder.get(b.region) ?? 0) ||
        a.start - b.start,
    )
    .slice(0, limit)
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/contemporaries.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/contemporaries.ts src/domain/contemporaries.test.ts
git commit -m "feat: add contemporaries lookup by interval intersection"
```

---

### Task 11: ズーム計算（domain/zoom）

**Files:**
- Create: `src/domain/zoom.ts`
- Test: `src/domain/zoom.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `type ZoomState = { pxPerYear: number; scrollTop: number }`、`minPxPerYear(totalYears: number, viewportHeight: number): number`（全時代が2.5画面）、`maxPxPerYear(viewportHeight: number): number`（1世紀が1画面）、`clampPxPerYear(pxPerYear: number, totalYears: number, viewportHeight: number): number`、`zoomAt(state: ZoomState, factor: number, anchorOffset: number, totalYears: number, viewportHeight: number): ZoomState`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/zoom.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { clampPxPerYear, maxPxPerYear, minPxPerYear, zoomAt } from './zoom'

describe('clampPxPerYear', () => {
  test('下限は全時代が2.5画面に収まるスケール', () => {
    expect(minPxPerYear(5100, 800)).toBeCloseTo((800 * 2.5) / 5100)
    expect(clampPxPerYear(0.001, 5100, 800)).toBeCloseTo(minPxPerYear(5100, 800))
  })

  test('上限は1世紀が1画面のスケール', () => {
    expect(maxPxPerYear(800)).toBe(8)
    expect(clampPxPerYear(100, 5100, 800)).toBe(8)
  })

  test('範囲内はそのまま', () => {
    expect(clampPxPerYear(2, 5100, 800)).toBe(2)
  })
})

describe('zoomAt', () => {
  test('アンカー位置の年が画面上で動かない', () => {
    const state = { pxPerYear: 2, scrollTop: 1000 }
    const anchorOffset = 300
    const anchorYears = (state.scrollTop + anchorOffset) / state.pxPerYear
    const next = zoomAt(state, 1.5, anchorOffset, 5100, 800)
    expect(next.pxPerYear).toBe(3)
    expect((next.scrollTop + anchorOffset) / next.pxPerYear).toBeCloseTo(anchorYears)
  })

  test('クランプされてもスクロール補正は新スケール基準', () => {
    const next = zoomAt({ pxPerYear: 7, scrollTop: 1000 }, 10, 400, 5100, 800)
    expect(next.pxPerYear).toBe(8)
  })

  test('scrollTop は負にならない', () => {
    const next = zoomAt({ pxPerYear: 2, scrollTop: 0 }, 0.5, 0, 5100, 800)
    expect(next.scrollTop).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/domain/zoom.test.ts`
Expected: FAIL（`./zoom` が存在しない）

- [ ] **Step 3: 実装する**

`src/domain/zoom.ts`:

```ts
export type ZoomState = {
  pxPerYear: number
  scrollTop: number
}

const FIT_ALL_SCREENS = 2.5
const CENTURY_YEARS = 100

export function minPxPerYear(totalYears: number, viewportHeight: number): number {
  return (viewportHeight * FIT_ALL_SCREENS) / totalYears
}

export function maxPxPerYear(viewportHeight: number): number {
  return viewportHeight / CENTURY_YEARS
}

export function clampPxPerYear(
  pxPerYear: number,
  totalYears: number,
  viewportHeight: number,
): number {
  return Math.min(
    Math.max(pxPerYear, minPxPerYear(totalYears, viewportHeight)),
    maxPxPerYear(viewportHeight),
  )
}

export function zoomAt(
  state: ZoomState,
  factor: number,
  anchorOffset: number,
  totalYears: number,
  viewportHeight: number,
): ZoomState {
  const pxPerYear = clampPxPerYear(state.pxPerYear * factor, totalYears, viewportHeight)
  const anchorYears = (state.scrollTop + anchorOffset) / state.pxPerYear
  return {
    pxPerYear,
    scrollTop: Math.max(0, anchorYears * pxPerYear - anchorOffset),
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/domain/zoom.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: コミット**

```bash
git add src/domain/zoom.ts src/domain/zoom.test.ts
git commit -m "feat: add zoom clamping and anchor-preserving zoom math"
```

---

### Task 12: データロード（data/load）

**Files:**
- Create: `src/data/load.ts`
- Test: `src/data/load.test.ts`

**Interfaces:**
- Consumes: 各スキーマ / `Dataset`（Task 2）
- Produces: `fetchDataset(baseUrl?: string): Promise<Dataset>`（baseUrl デフォルト `import.meta.env.BASE_URL`。`regions` は `order` 昇順にソート済み。fetch 失敗・スキーマ違反で throw）

- [ ] **Step 1: 失敗するテストを書く**

`src/data/load.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import { fetchDataset } from './load'

const config = { minYear: -3000, maxYear: 2100 }
const regions = [
  { id: 'east-asia', name: '東アジア', order: 6, color: '#3fa06b' },
  { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' },
]
const entries = [
  {
    id: 'edward-1',
    type: 'ruler',
    region: 'west-europe',
    title: 'エドワード1世',
    start: 1272,
    end: 1307,
    importance: 2,
    description: 'ウェールズを征服。',
  },
]

function stubFetchWith(bodies: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      const body = bodies[name]
      if (body === undefined) return new Response('not found', { status: 404 })
      return new Response(JSON.stringify(body))
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDataset', () => {
  test('3ファイルを取得し、地域を order 順に返す', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions, 'entries.json': entries })
    const dataset = await fetchDataset('/base/')
    expect(dataset.config).toEqual(config)
    expect(dataset.regions.map(r => r.id)).toEqual(['west-europe', 'east-asia'])
    expect(dataset.entries).toHaveLength(1)
  })

  test('baseUrl からのパスで取得する', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions, 'entries.json': entries })
    await fetchDataset('/base/')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/base/data/config.json')
  })

  test('HTTP エラーで reject する', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions })
    await expect(fetchDataset('/base/')).rejects.toThrow('404')
  })

  test('スキーマ違反で reject する', async () => {
    stubFetchWith({
      'config.json': config,
      'regions.json': regions,
      'entries.json': [{ id: 'broken' }],
    })
    await expect(fetchDataset('/base/')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/data/load.test.ts`
Expected: FAIL（`./load` が存在しない）

- [ ] **Step 3: 実装する**

`src/data/load.ts`:

```ts
import { configSchema, type Dataset, entriesSchema, regionsSchema } from './schema'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`)
  return res.json()
}

export async function fetchDataset(baseUrl: string = import.meta.env.BASE_URL): Promise<Dataset> {
  const [config, regions, entries] = await Promise.all([
    fetchJson(`${baseUrl}data/config.json`),
    fetchJson(`${baseUrl}data/regions.json`),
    fetchJson(`${baseUrl}data/entries.json`),
  ])
  return {
    config: configSchema.parse(config),
    regions: [...regionsSchema.parse(regions)].sort((a, b) => a.order - b.order),
    entries: entriesSchema.parse(entries),
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `pnpm vitest run src/data/load.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
git add src/data/load.ts src/data/load.test.ts
git commit -m "feat: add dataset fetching with schema parsing"
```

---

### Task 13: DESIGN.md・デザイントークン・Claude Design 同期

このタスクはユーザーとの対話を含む（Claude Design のレビューは本人がブラウザで行う）。同期ステップまで進んだらユーザーに確認を求めて一時停止すること。

**Files:**
- Create: `DESIGN.md`, `design/previews/foundations.html`, `design/previews/timeline-parts.html`
- Modify: `src/index.css`（`@theme` トークン追加）

**Interfaces:**
- Consumes: なし
- Produces: Tailwind ユーティリティとして参照可能なトークン（`bg-surface` / `text-ink` / `text-muted` / `bg-panel` / `border-line` と、種別色 `--color-ruler` / `--color-person` / `--color-event`）。後続の UI タスクはこれらのトークン名を使う

- [ ] **Step 1: DESIGN.md を書く**

`DESIGN.md`（[design.md](https://github.com/google-labs-code/design.md) フォーマット。YAML フロントマター＋本文）:

```markdown
---
colors:
  primary: "#1a1c1e"
  surface: "#fafaf9"
  panel: "#ffffff"
  ink: "#1a1c1e"
  muted: "#6b7280"
  line: "#e5e4e0"
  accent: "#4a90d9"
  ruler: "#3b6fb0"
  person: "#7a5cb8"
  event: "#c2571f"
typography:
  base:
    fontFamily: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif
    fontSize: 14px
    fontWeight: 400
  label:
    fontSize: 12px
    fontWeight: 500
  heading:
    fontSize: 16px
    fontWeight: 600
  display:
    fontSize: 20px
    fontWeight: 700
layout:
  spacingUnit: 4px
shapes:
  cornerRadius: 6px
  barCornerRadius: 4px
---

# 世界史タイムライン デザイン

## Overview

学習ツールとして「静かで読みやすい」ことを最優先する。長時間眺める画面なので、
彩度の低い紙のような背景（{colors.surface}）に、情報の主役であるエントリの
バーだけが色を持つ。装飾は加えない。

## Colors

- {colors.ink}: 本文・見出し。ほぼ黒のインク色
- {colors.muted}: 補助テキスト（年ラベル・説明）
- {colors.ruler} / {colors.person} / {colors.event}: エントリ種別の色。
  統治者は青系、人物は紫系、事件は橙系で、色覚多様性に配慮して明度差もつける
- 地域色はデータ（regions.json）が持ち、レーン背景の淡色（不透明度 6%）にのみ使う

## Do's and Don'ts

- Do: テキストは {colors.ink} または {colors.muted} のみ。コントラスト比 AA を守る
- Do: 種別の描き分けは色相＋形状（バー / ◆）の二重符号化にする
- Don't: 地域色を文字色に使わない
- Don't: グラデーション・影・アニメーションを装飾目的で足さない
```

- [ ] **Step 2: トークンを Tailwind @theme に反映する**

`src/index.css` を次の内容にする:

```css
@import "tailwindcss";

@theme {
  --color-surface: #fafaf9;
  --color-panel: #ffffff;
  --color-ink: #1a1c1e;
  --color-muted: #6b7280;
  --color-line: #e5e4e0;
  --color-accent: #4a90d9;
  --color-ruler: #3b6fb0;
  --color-person: #7a5cb8;
  --color-event: #c2571f;
}

body {
  font-family: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif;
  color: var(--color-ink);
  background: var(--color-surface);
}
```

- [ ] **Step 3: プレビュー HTML を書く**

`design/previews/foundations.html`（自己完結の HTML。1行目に Claude Design 用カードマーカーを入れる）:

```html
<!-- @dsCard group="Foundations" -->
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --surface: #fafaf9; --panel: #ffffff; --ink: #1a1c1e; --muted: #6b7280;
    --line: #e5e4e0; --accent: #4a90d9; --ruler: #3b6fb0; --person: #7a5cb8; --event: #c2571f;
  }
  body { font-family: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif; background: var(--surface); color: var(--ink); padding: 24px; }
  .swatch { display: inline-block; width: 120px; margin: 4px; padding: 8px; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; font-size: 12px; }
  .chip { height: 40px; border-radius: 4px; margin-bottom: 4px; }
</style>
</head>
<body>
  <h1 style="font-size:20px;font-weight:700">カラートークン</h1>
  <div class="swatch"><div class="chip" style="background:var(--ink)"></div>ink</div>
  <div class="swatch"><div class="chip" style="background:var(--muted)"></div>muted</div>
  <div class="swatch"><div class="chip" style="background:var(--accent)"></div>accent</div>
  <div class="swatch"><div class="chip" style="background:var(--ruler)"></div>ruler 統治者</div>
  <div class="swatch"><div class="chip" style="background:var(--person)"></div>person 人物</div>
  <div class="swatch"><div class="chip" style="background:var(--event)"></div>event 事件</div>
  <h1 style="font-size:20px;font-weight:700;margin-top:24px">タイポグラフィ</h1>
  <p style="font-size:20px;font-weight:700">display 20px — 世界史タイムライン</p>
  <p style="font-size:16px;font-weight:600">heading 16px — エドワード1世</p>
  <p style="font-size:14px">base 14px — ウェールズを征服し、模範議会を招集。</p>
  <p style="font-size:12px;font-weight:500;color:var(--muted)">label 12px — 1272年〜1307年</p>
</body>
</html>
```

`design/previews/timeline-parts.html`（エントリバー・点イベント・詳細パネルのモック）:

```html
<!-- @dsCard group="Components" -->
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<style>
  :root {
    --surface: #fafaf9; --panel: #ffffff; --ink: #1a1c1e; --muted: #6b7280;
    --line: #e5e4e0; --accent: #4a90d9; --ruler: #3b6fb0; --person: #7a5cb8; --event: #c2571f;
  }
  body { font-family: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif; background: var(--surface); color: var(--ink); padding: 24px; display: flex; gap: 32px; }
  .bar { width: 88px; border-radius: 4px; color: #fff; font-size: 12px; padding: 6px; box-sizing: border-box; }
  .panel { width: 280px; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px; }
</style>
</head>
<body>
  <div>
    <h2 style="font-size:16px;font-weight:600">エントリバー</h2>
    <div style="background:#4a90d90f;padding:12px;display:flex;gap:8px">
      <div class="bar" style="height:140px;background:var(--ruler)">エドワード1世</div>
      <div class="bar" style="height:96px;background:var(--person)">マルコ・ポーロ</div>
      <div style="font-size:12px;color:var(--event)">◆ アナーニ事件</div>
    </div>
  </div>
  <div class="panel">
    <h2 style="font-size:16px;font-weight:600;margin:0">エドワード1世</h2>
    <p style="font-size:12px;color:var(--muted);margin:4px 0">統治者 ・ イングランド ・ 1272年〜1307年</p>
    <p style="font-size:14px">ウェールズを征服し、模範議会を招集。スコットランド遠征中に病没。</p>
    <h3 style="font-size:12px;font-weight:500;color:var(--muted);margin-bottom:4px">同時代</h3>
    <p style="font-size:14px;margin:2px 0">フビライ・ハン（東アジア）</p>
    <p style="font-size:14px;margin:2px 0">北条時宗（日本）</p>
  </div>
</body>
</html>
```

- [ ] **Step 4: コミット**

```bash
git add DESIGN.md design/previews src/index.css
git commit -m "feat: add DESIGN.md tokens, tailwind theme, and design previews"
```

- [ ] **Step 5: Claude Design に同期しユーザーレビューを受ける（要ユーザー対話）**

Claude Code の `/design-sync` スキルを使い、`design/previews/` を claude.ai/design のデザインシステムプロジェクト（なければ `world-history-timeline` という名前で作成）へ同期する。claude.ai へのログインが必要なため、実行前にユーザーへ知らせること。

同期後、ユーザーにブラウザでのレビューを依頼して**このタスクで一時停止**する。フィードバックがあれば `DESIGN.md`・`src/index.css`・プレビューに反映して再同期し（リポジトリ側が常に正）、修正は `style: refine design tokens` 等でコミットして次のタスクへ進む。

---

### Task 14: データロード表示と ErrorBoundary（App シェル）

**Files:**
- Create: `src/hooks/useTimelineData.ts`, `src/components/ErrorBoundary.tsx`, `src/components/TimelinePage.tsx`（仮実装）, `src/test/fixtures.ts`
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `fetchDataset`（Task 12）、`Dataset`（Task 2）
- Produces: `useTimelineData(): { status: 'loading' | 'ready' | 'error'; dataset?: Dataset; reload: () => void }`、`ErrorBoundary`（children を受ける）、`TimelinePage({ dataset }: { dataset: Dataset })`（このタスクでは仮表示）、テスト用 `testDataset: Dataset` と `stubFetch(dataset: Dataset): void`

- [ ] **Step 1: フィクスチャを書く**

`src/test/fixtures.ts`:

```ts
import { vi } from 'vitest'
import type { Dataset } from '../data/schema'
import { makeEntry } from './factory'

export const testDataset: Dataset = {
  config: { minYear: -700, maxYear: 2100 },
  regions: [
    { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' },
    { id: 'east-asia', name: '東アジア', order: 6, color: '#3fa06b' },
    { id: 'japan', name: '日本', order: 7, color: '#d94a4a' },
  ],
  entries: [
    makeEntry({ id: 'edward-1', title: 'エドワード1世', group: 'england', groupName: 'イングランド', start: 1272, end: 1307, importance: 1 }),
    makeEntry({ id: 'philippe-4', title: 'フィリップ4世', group: 'france', groupName: 'フランス', start: 1285, end: 1314, importance: 1 }),
    makeEntry({ id: 'kublai-khan', title: 'フビライ・ハン', region: 'east-asia', group: 'yuan', groupName: '元', start: 1260, end: 1294, importance: 1 }),
    makeEntry({ id: 'marco-polo', title: 'マルコ・ポーロ', region: 'east-asia', type: 'person', start: 1271, end: 1295, importance: 1 }),
    makeEntry({ id: 'anagni', title: 'アナーニ事件', type: 'event', start: 1303, end: undefined, importance: 1 }),
    makeEntry({ id: 'tokimune', title: '北条時宗', region: 'japan', group: 'kamakura', groupName: '鎌倉幕府', start: 1268, end: 1284, importance: 2 }),
  ],
}

export function stubFetch(dataset: Dataset): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      const body =
        name === 'config.json'
          ? dataset.config
          : name === 'regions.json'
            ? dataset.regions
            : dataset.entries
      return new Response(JSON.stringify(body))
    }),
  )
}
```

fixtures の `config` を実データ（-3000〜2100）より狭い -700〜2100 にしているのは意図的なもの。jsdom のフォールバック高 800px と組み合わせると、初期ズーム（全体表示相当）が importance 1 のみの表示階層に落ち、かつ13世紀のエントリがカリング範囲に入るため、Task 15〜16 の表示テストが決定的になる。

- [ ] **Step 2: 失敗するテストを書く**

`src/App.test.tsx` を次の内容に置き換える:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { stubFetch, testDataset } from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('ロード完了までローディングを表示する', async () => {
  stubFetch(testDataset)
  render(<App />)
  expect(screen.getByText('読み込み中…')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: '世界史タイムライン' })).toBeInTheDocument()
})

test('fetch 失敗でエラーと再試行ボタンを表示し、再試行で回復する', async () => {
  const failing = vi.fn(async () => new Response('oops', { status: 500 }))
  vi.stubGlobal('fetch', failing)
  render(<App />)
  const retry = await screen.findByRole('button', { name: '再試行' })
  stubFetch(testDataset)
  await userEvent.click(retry)
  expect(await screen.findByRole('heading', { name: '世界史タイムライン' })).toBeInTheDocument()
})
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL（ローディング表示が存在しない）

- [ ] **Step 4: 実装する**

`src/hooks/useTimelineData.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { fetchDataset } from '../data/load'
import type { Dataset } from '../data/schema'

type State =
  | { status: 'loading' }
  | { status: 'ready'; dataset: Dataset }
  | { status: 'error' }

export function useTimelineData() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    fetchDataset().then(
      dataset => setState({ status: 'ready', dataset }),
      () => setState({ status: 'error' }),
    )
  }, [])

  useEffect(reload, [reload])

  return {
    status: state.status,
    dataset: state.status === 'ready' ? state.dataset : undefined,
    reload,
  }
}
```

`src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid h-dvh place-items-center">
          <div className="text-center">
            <p className="mb-4">問題が発生しました</p>
            <button
              type="button"
              className="rounded-md bg-accent px-4 py-2 text-white"
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

`src/components/TimelinePage.tsx`（仮実装。Task 15 で置き換える）:

```tsx
import type { Dataset } from '../data/schema'

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">世界史タイムライン</h1>
      <p className="text-muted">
        {dataset.regions.length} 地域 / {dataset.entries.length} エントリ
      </p>
    </div>
  )
}
```

`src/App.tsx` を次の内容に置き換える:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary'
import { TimelinePage } from './components/TimelinePage'
import { useTimelineData } from './hooks/useTimelineData'

function TimelineRoot() {
  const { status, dataset, reload } = useTimelineData()
  if (status === 'loading') {
    return <div className="grid h-dvh place-items-center text-muted">読み込み中…</div>
  }
  if (dataset === undefined) {
    return (
      <div className="grid h-dvh place-items-center">
        <div className="text-center">
          <p className="mb-4">データの読み込みに失敗しました</p>
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-white"
            onClick={reload}
          >
            再試行
          </button>
        </div>
      </div>
    )
  }
  return <TimelinePage dataset={dataset} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <TimelineRoot />
    </ErrorBoundary>
  )
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS（2 tests）

- [ ] **Step 6: コミット**

```bash
git add src/hooks/useTimelineData.ts src/components/ErrorBoundary.tsx src/components/TimelinePage.tsx src/test/fixtures.ts src/App.tsx src/App.test.tsx
git commit -m "feat: add data loading states and error boundary"
```

---

### Task 15: タイムライン静的描画

**Files:**
- Create: `src/components/layout.ts`, `src/components/TimelineView.tsx`, `src/components/LaneHeaders.tsx`, `src/components/TimeAxis.tsx`, `src/components/EntryBar.tsx`, `src/components/EventMarker.tsx`
- Modify: `src/components/TimelinePage.tsx`（仮実装を置き換え）
- Test: `src/components/TimelinePage.test.tsx`

**Interfaces:**
- Consumes: `createScale` / `Scale`（Task 5）、`tickInterval` / `generateTicks`（Task 6）、`packLane` / `LaneLayout`（Task 7）、`maxVisibleImportance` / `visibleEntries`（Task 8）、`minPxPerYear`（Task 11）、`formatYear` / `formatSpan`（Task 4）、`testDataset` / `stubFetch`（Task 14）
- Produces: `TimelinePage`（本実装）、`TimelineView`、レイアウト定数 `COLUMN_WIDTH = 88` / `COLUMN_GAP = 8` / `LANE_PADDING = 12` / `AXIS_WIDTH = 64` / `HEADER_HEIGHT = 40` / `LABEL_MIN_HEIGHT = 16`、`laneWidth(layout: LaneLayout | undefined): number`、`columnX(laneX: number, column: number): number`。エントリは `role="button"`・`aria-label="タイトル 期間"` でアクセス可能

jsdom にはレイアウト計算がないため、`clientHeight` が 0 のときは 800 にフォールバックする（テストはこの値に依存する）。

- [ ] **Step 1: 失敗するテストを書く**

`src/components/TimelinePage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { TimelinePage } from './TimelinePage'
import { testDataset } from '../test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('地域ヘッダーを order 順に表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  const headers = screen.getAllByRole('columnheader').map(h => h.textContent)
  expect(headers).toEqual(['西欧', '東アジア', '日本'])
})

test('importance 1 のエントリをバーとして描画する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(
    screen.getByRole('button', { name: 'エドワード1世 1272年〜1307年' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'フビライ・ハン 1260年〜1294年' }),
  ).toBeInTheDocument()
})

test('初期ズーム（全体表示）では importance 2 を描画しない', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('button', { name: /北条時宗/ })).not.toBeInTheDocument()
})

test('点イベントを ◆ マーカーとして描画する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getByRole('button', { name: 'アナーニ事件 1303年' })).toBeInTheDocument()
})

test('開始年の差がバーの Y 座標に反映される', () => {
  render(<TimelinePage dataset={testDataset} />)
  const edward = screen.getByRole('button', { name: /エドワード1世/ })
  const kublai = screen.getByRole('button', { name: /フビライ・ハン/ })
  const yOf = (el: HTMLElement) => Number(el.getAttribute('y'))
  expect(yOf(kublai)).toBeLessThan(yOf(edward))
})

test('年目盛を表示する', () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.getAllByText('前500年').length).toBeGreaterThan(0)
  expect(screen.getAllByText('1000年').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: FAIL（columnheader が存在しない）

- [ ] **Step 3: レイアウト定数を書く**

`src/components/layout.ts`:

```ts
import type { LaneLayout } from '../domain/packing'

export const COLUMN_WIDTH = 88
export const COLUMN_GAP = 8
export const LANE_PADDING = 12
export const AXIS_WIDTH = 64
export const HEADER_HEIGHT = 40
export const LABEL_MIN_HEIGHT = 16

export function laneWidth(layout: LaneLayout | undefined): number {
  const columns = Math.max(layout?.columnCount ?? 1, 1)
  return columns * COLUMN_WIDTH + (columns - 1) * COLUMN_GAP + LANE_PADDING * 2
}

export function columnX(laneX: number, column: number): number {
  return laneX + LANE_PADDING + column * (COLUMN_WIDTH + COLUMN_GAP)
}
```

- [ ] **Step 4: 部品コンポーネントを書く**

`src/components/LaneHeaders.tsx`:

```tsx
import type { Region } from '../data/schema'
import { AXIS_WIDTH, HEADER_HEIGHT } from './layout'

type Props = {
  regions: Region[]
  widths: number[]
}

export function LaneHeaders({ regions, widths }: Props) {
  return (
    <div className="sticky top-0 z-20 flex w-max border-b border-line bg-panel" role="row">
      <div className="sticky left-0 z-10 shrink-0 bg-panel" style={{ width: AXIS_WIDTH }} />
      {regions.map((region, i) => (
        <div
          key={region.id}
          role="columnheader"
          className="flex items-center justify-center text-sm font-medium"
          style={{ width: widths[i], height: HEADER_HEIGHT, borderTop: `3px solid ${region.color}` }}
        >
          {region.name}
        </div>
      ))}
    </div>
  )
}
```

`src/components/TimeAxis.tsx`:

```tsx
import { formatYear } from '../domain/format'
import type { Scale } from '../domain/scale'
import { generateTicks, tickInterval } from '../domain/ticks'
import { AXIS_WIDTH } from './layout'

type Props = {
  scale: Scale
  minYear: number
  maxYear: number
}

export function TimeAxis({ scale, minYear, maxYear }: Props) {
  const ticks = generateTicks(minYear, maxYear, tickInterval(scale.pxPerYear))
  return (
    <div className="sticky left-0 z-10 shrink-0 bg-surface" style={{ width: AXIS_WIDTH }}>
      <svg width={AXIS_WIDTH} height={scale.totalHeight} aria-hidden="true">
        {ticks.map(year => (
          <g key={year}>
            <line
              x1={AXIS_WIDTH - 8}
              x2={AXIS_WIDTH}
              y1={scale.yearToY(year)}
              y2={scale.yearToY(year)}
              stroke="var(--color-line)"
            />
            <text
              x={AXIS_WIDTH - 12}
              y={scale.yearToY(year) + 4}
              textAnchor="end"
              className="fill-muted text-[11px]"
            >
              {formatYear(year)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
```

`src/components/EntryBar.tsx`:

```tsx
import type { Entry } from '../data/schema'
import { formatSpan } from '../domain/format'
import type { Scale } from '../domain/scale'
import { COLUMN_WIDTH, columnX, LABEL_MIN_HEIGHT } from './layout'

const TYPE_FILL: Record<Entry['type'], string> = {
  ruler: 'var(--color-ruler)',
  person: 'var(--color-person)',
  event: 'var(--color-event)',
}

type Props = {
  entry: Entry
  laneX: number
  column: number
  scale: Scale
  selected: boolean
  onSelect: (id: string) => void
  viewportTopY: number
}

export function EntryBar({ entry, laneX, column, scale, selected, onSelect, viewportTopY }: Props) {
  const top = scale.yearToY(entry.start)
  const bottom = scale.yearToY(entry.end ?? entry.start)
  const height = Math.max(bottom - top, 2)
  const x = columnX(laneX, column)
  const showLabel = height >= LABEL_MIN_HEIGHT
  const labelY = Math.min(Math.max(top + 4, viewportTopY + 4), bottom - LABEL_MIN_HEIGHT)
  return (
    <g>
      <rect
        role="button"
        tabIndex={0}
        aria-label={`${entry.title} ${formatSpan(entry.start, entry.end)}`}
        aria-pressed={selected}
        x={x}
        y={top}
        width={COLUMN_WIDTH}
        height={height}
        rx={4}
        fill={TYPE_FILL[entry.type]}
        opacity={selected ? 1 : 0.85}
        stroke={selected ? 'var(--color-ink)' : 'none'}
        strokeWidth={selected ? 2 : 0}
        className="cursor-pointer"
        onClick={() => onSelect(entry.id)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(entry.id)
          }
        }}
      />
      {showLabel && (
        <text
          x={x + 6}
          y={labelY + 11}
          className="pointer-events-none fill-white text-[11px] font-medium"
        >
          {entry.title}
        </text>
      )}
    </g>
  )
}
```

`src/components/EventMarker.tsx`:

```tsx
import type { Entry } from '../data/schema'
import { formatYear } from '../domain/format'
import type { Scale } from '../domain/scale'
import { columnX } from './layout'

type Props = {
  entry: Entry
  laneX: number
  column: number
  scale: Scale
  selected: boolean
  onSelect: (id: string) => void
}

export function EventMarker({ entry, laneX, column, scale, selected, onSelect }: Props) {
  const y = scale.yearToY(entry.start)
  const x = columnX(laneX, column)
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${entry.title} ${formatYear(entry.start)}`}
      aria-pressed={selected}
      className="cursor-pointer"
      onClick={() => onSelect(entry.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(entry.id)
        }
      }}
    >
      <path
        d={`M ${x + 6} ${y - 6} L ${x + 12} ${y} L ${x + 6} ${y + 6} L ${x} ${y} Z`}
        fill="var(--color-event)"
        stroke={selected ? 'var(--color-ink)' : 'none'}
        strokeWidth={selected ? 2 : 0}
      />
      <text x={x + 16} y={y + 4} className="pointer-events-none fill-ink text-[11px]">
        {entry.title}
      </text>
    </g>
  )
}
```

- [ ] **Step 5: TimelineView と TimelinePage を書く**

`src/components/TimelineView.tsx`:

```tsx
import type { ReactNode, RefObject, UIEvent, WheelEvent } from 'react'
import type { Dataset } from '../data/schema'
import type { LaneLayout } from '../domain/packing'
import type { Scale } from '../domain/scale'
import { EntryBar } from './EntryBar'
import { EventMarker } from './EventMarker'
import { LaneHeaders } from './LaneHeaders'
import { laneWidth } from './layout'
import { TimeAxis } from './TimeAxis'

type Props = {
  containerRef: RefObject<HTMLDivElement | null>
  dataset: Dataset
  scale: Scale
  laneLayouts: Map<string, LaneLayout>
  inView: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
  onScroll: (e: UIEvent<HTMLDivElement>) => void
  onWheel: (e: WheelEvent<HTMLDivElement>) => void
  viewportTopY: number
  children?: ReactNode
}

export function TimelineView({
  containerRef,
  dataset,
  scale,
  laneLayouts,
  inView,
  selectedId,
  onSelect,
  onScroll,
  onWheel,
  viewportTopY,
  children,
}: Props) {
  const { config, regions } = dataset
  const widths = regions.map(r => laneWidth(laneLayouts.get(r.id)))
  const offsets: number[] = []
  let acc = 0
  for (const width of widths) {
    offsets.push(acc)
    acc += width
  }

  return (
    <div
      ref={containerRef}
      data-testid="timeline-scroll"
      className="h-dvh overflow-auto"
      onScroll={onScroll}
      onWheel={onWheel}
    >
      <LaneHeaders regions={regions} widths={widths} />
      <div className="flex w-max">
        <TimeAxis scale={scale} minYear={config.minYear} maxYear={config.maxYear} />
        <svg width={acc} height={scale.totalHeight} aria-label="年表">
          {regions.map((region, i) => {
            const layout = laneLayouts.get(region.id)
            if (!layout) return null
            return (
              <g key={region.id}>
                <rect
                  x={offsets[i]}
                  y={0}
                  width={widths[i]}
                  height={scale.totalHeight}
                  fill={region.color}
                  opacity={0.06}
                />
                {layout.positioned
                  .filter(p => inView.has(p.entry.id))
                  .map(p =>
                    p.entry.end === undefined ? (
                      <EventMarker
                        key={p.entry.id}
                        entry={p.entry}
                        laneX={offsets[i]}
                        column={p.column}
                        scale={scale}
                        selected={p.entry.id === selectedId}
                        onSelect={onSelect}
                      />
                    ) : (
                      <EntryBar
                        key={p.entry.id}
                        entry={p.entry}
                        laneX={offsets[i]}
                        column={p.column}
                        scale={scale}
                        selected={p.entry.id === selectedId}
                        onSelect={onSelect}
                        viewportTopY={viewportTopY}
                      />
                    ),
                  )}
              </g>
            )
          })}
        </svg>
      </div>
      {children}
    </div>
  )
}
```

`src/components/TimelinePage.tsx` を次の内容に置き換える:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dataset } from '../data/schema'
import { packLane } from '../domain/packing'
import { createScale } from '../domain/scale'
import { maxVisibleImportance, visibleEntries } from '../domain/visibility'
import { minPxPerYear } from '../domain/zoom'
import { TimelineView } from './TimelineView'

const FALLBACK_VIEWPORT_HEIGHT = 800

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { config, regions, entries } = dataset
  const totalYears = config.maxYear - config.minYear
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [pxPerYear] = useState(() => minPxPerYear(totalYears, FALLBACK_VIEWPORT_HEIGHT))
  const [scrollTop, setScrollTop] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const measure = () =>
      setViewportHeight(containerRef.current?.clientHeight || FALLBACK_VIEWPORT_HEIGHT)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const scale = useMemo(
    () => createScale(config.minYear, config.maxYear, pxPerYear),
    [config, pxPerYear],
  )
  const maxImportance = maxVisibleImportance(pxPerYear)
  const tierEntries = useMemo(
    () => entries.filter(e => e.importance <= maxImportance),
    [entries, maxImportance],
  )
  const laneLayouts = useMemo(
    () =>
      new Map(regions.map(r => [r.id, packLane(tierEntries.filter(e => e.region === r.id))])),
    [regions, tierEntries],
  )
  const inView = useMemo(() => {
    const marginYears = viewportHeight / pxPerYear
    const topYear = scale.yToYear(scrollTop) - marginYears
    const bottomYear = scale.yToYear(scrollTop + viewportHeight) + marginYears
    return new Set(visibleEntries(tierEntries, topYear, bottomYear, maxImportance).map(e => e.id))
  }, [tierEntries, scale, scrollTop, viewportHeight, pxPerYear, maxImportance])

  return (
    <TimelineView
      containerRef={containerRef}
      dataset={dataset}
      scale={scale}
      laneLayouts={laneLayouts}
      inView={inView}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      onWheel={() => {}}
      viewportTopY={scrollTop}
    />
  )
}
```

`src/App.test.tsx` の成功時アサーション（2箇所の `getByRole('heading', …)` / `findByRole('heading', …)`）は、仮実装の見出しが消えるため次に置き換える:

```tsx
expect(await screen.findByRole('columnheader', { name: '西欧' })).toBeInTheDocument()
```

- [ ] **Step 6: テストが通ることを確認**

Run: `pnpm vitest run src/components/TimelinePage.test.tsx && pnpm test`
Expected: 新テスト PASS（6 tests）、既存テストもすべて PASS

- [ ] **Step 7: dev サーバーで目視確認**

Run: `pnpm dev`
確認: 3レーンではなく実データ（8レーン・15エントリ）が表示される。エドワード1世・フィリップ4世・フビライ・ハンのバーがほぼ同じ高さ（13世紀末）に並ぶ。

- [ ] **Step 8: コミット**

```bash
git add src/components
git commit -m "feat: render lanes, axis, bars, and markers on vertical timeline"
```

---

### Task 16: ズーム操作

**Files:**
- Create: `src/components/ZoomControls.tsx`
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/TimelinePage.test.tsx`（追記）

**Interfaces:**
- Consumes: `zoomAt` / `clampPxPerYear` / `minPxPerYear`（Task 11）、`maxVisibleImportance`（Task 8）
- Produces: `ZoomControls({ onZoomIn, onZoomOut, onFitAll }: { onZoomIn: () => void; onZoomOut: () => void; onFitAll: () => void })`（aria-label は「拡大」「縮小」「全体表示」）。Ctrl/⌘＋ホイールでカーソル位置アンカーのズーム、ピンチ（2ポインタ）ズーム

- [ ] **Step 1: 失敗するテストを書く**

`src/components/TimelinePage.test.tsx` に追記:

```tsx
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'

const barHeight = (name: RegExp) =>
  Number(screen.getByRole('button', { name }).getAttribute('height'))

test('拡大ボタンでバーが高くなる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), { target: { scrollTop: 1000 } })
  const before = barHeight(/エドワード1世/)
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  expect(barHeight(/エドワード1世/)).toBeGreaterThan(before)
})

test('拡大してその時代へスクロールすると importance 2 のエントリが現れる', async () => {
  render(<TimelinePage dataset={testDataset} />)
  expect(screen.queryByRole('button', { name: /北条時宗/ })).not.toBeInTheDocument()
  const zoomIn = screen.getByRole('button', { name: '拡大' })
  for (let i = 0; i < 10; i++) {
    await userEvent.click(zoomIn)
  }
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), {
    target: { scrollTop: (1268 - -700) * 8 - 400 },
  })
  expect(screen.getByRole('button', { name: /北条時宗/ })).toBeInTheDocument()
})

test('全体表示ボタンで初期スケールに戻る', async () => {
  render(<TimelinePage dataset={testDataset} />)
  const before = barHeight(/エドワード1世/)
  await userEvent.click(screen.getByRole('button', { name: '拡大' }))
  await userEvent.click(screen.getByRole('button', { name: '全体表示' }))
  expect(barHeight(/エドワード1世/)).toBeCloseTo(before)
})

test('Ctrl+ホイールでズームする', () => {
  render(<TimelinePage dataset={testDataset} />)
  fireEvent.scroll(screen.getByTestId('timeline-scroll'), { target: { scrollTop: 1000 } })
  const before = barHeight(/エドワード1世/)
  fireEvent.wheel(screen.getByTestId('timeline-scroll'), {
    deltaY: -100,
    ctrlKey: true,
    clientY: 400,
  })
  expect(barHeight(/エドワード1世/)).toBeGreaterThan(before)
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: FAIL（「拡大」ボタンが存在しない）

- [ ] **Step 3: ZoomControls を書く**

`src/components/ZoomControls.tsx`:

```tsx
type Props = {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitAll: () => void
}

const buttonClass =
  'grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-lg shadow-sm'

export function ZoomControls({ onZoomIn, onZoomOut, onFitAll }: Props) {
  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col gap-2">
      <button type="button" aria-label="拡大" className={buttonClass} onClick={onZoomIn}>
        ＋
      </button>
      <button type="button" aria-label="縮小" className={buttonClass} onClick={onZoomOut}>
        −
      </button>
      <button
        type="button"
        aria-label="全体表示"
        className={`${buttonClass} text-xs`}
        onClick={onFitAll}
      >
        全体
      </button>
    </div>
  )
}
```

- [ ] **Step 4: TimelinePage にズーム状態を実装する**

`src/components/TimelinePage.tsx` に以下を実装する（変更後の全体像）:

```tsx
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Dataset } from '../data/schema'
import { packLane } from '../domain/packing'
import { createScale } from '../domain/scale'
import { maxVisibleImportance, visibleEntries } from '../domain/visibility'
import { minPxPerYear, zoomAt, type ZoomState } from '../domain/zoom'
import { TimelineView } from './TimelineView'
import { ZoomControls } from './ZoomControls'

const FALLBACK_VIEWPORT_HEIGHT = 800
const BUTTON_ZOOM_FACTOR = 1.4
const WHEEL_ZOOM_FACTOR = 1.2

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  const { config, regions, entries } = dataset
  const totalYears = config.maxYear - config.minYear
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT)
  const [zoom, setZoom] = useState<ZoomState>({
    pxPerYear: minPxPerYear(totalYears, FALLBACK_VIEWPORT_HEIGHT),
    scrollTop: 0,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => {
    const measure = () =>
      setViewportHeight(containerRef.current?.clientHeight || FALLBACK_VIEWPORT_HEIGHT)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container && container.scrollTop !== zoom.scrollTop) {
      container.scrollTop = zoom.scrollTop
    }
  }, [zoom])

  const applyZoom = useCallback(
    (factor: number, anchorOffset: number) => {
      setZoom(prev => zoomAt(prev, factor, anchorOffset, totalYears, viewportHeight))
    },
    [totalYears, viewportHeight],
  )

  const scale = useMemo(
    () => createScale(config.minYear, config.maxYear, zoom.pxPerYear),
    [config, zoom.pxPerYear],
  )
  const maxImportance = maxVisibleImportance(zoom.pxPerYear)
  const tierEntries = useMemo(
    () => entries.filter(e => e.importance <= maxImportance),
    [entries, maxImportance],
  )
  const laneLayouts = useMemo(
    () =>
      new Map(regions.map(r => [r.id, packLane(tierEntries.filter(e => e.region === r.id))])),
    [regions, tierEntries],
  )
  const inView = useMemo(() => {
    const marginYears = viewportHeight / zoom.pxPerYear
    const topYear = scale.yToYear(zoom.scrollTop) - marginYears
    const bottomYear = scale.yToYear(zoom.scrollTop + viewportHeight) + marginYears
    return new Set(visibleEntries(tierEntries, topYear, bottomYear, maxImportance).map(e => e.id))
  }, [tierEntries, scale, zoom, viewportHeight, maxImportance])

  const handlePointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const handlePointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || pointers.current.size !== 2) {
      if (prev) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      return
    }
    const [a, b] = [...pointers.current.values()]
    const distanceBefore = Math.hypot(a.x - b.x, a.y - b.y)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const [a2, b2] = [...pointers.current.values()]
    const distanceAfter = Math.hypot(a2.x - b2.x, a2.y - b2.y)
    if (distanceBefore > 0) {
      const rect = containerRef.current?.getBoundingClientRect()
      const anchorOffset = (a2.y + b2.y) / 2 - (rect?.top ?? 0)
      applyZoom(distanceAfter / distanceBefore, anchorOffset)
    }
  }
  const handlePointerEnd = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <TimelineView
        containerRef={containerRef}
        dataset={dataset}
        scale={scale}
        laneLayouts={laneLayouts}
        inView={inView}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onScroll={e => {
          const scrollTop = e.currentTarget.scrollTop
          setZoom(prev => (prev.scrollTop === scrollTop ? prev : { ...prev, scrollTop }))
        }}
        onWheel={e => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          const rect = e.currentTarget.getBoundingClientRect()
          applyZoom(
            e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR,
            e.clientY - rect.top,
          )
        }}
        viewportTopY={zoom.scrollTop}
      />
      <ZoomControls
        onZoomIn={() => applyZoom(BUTTON_ZOOM_FACTOR, viewportHeight / 2)}
        onZoomOut={() => applyZoom(1 / BUTTON_ZOOM_FACTOR, viewportHeight / 2)}
        onFitAll={() =>
          setZoom({ pxPerYear: minPxPerYear(totalYears, viewportHeight), scrollTop: 0 })
        }
      />
    </div>
  )
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `pnpm test`
Expected: すべて PASS

- [ ] **Step 6: dev サーバーで目視確認**

Run: `pnpm dev`
確認: ＋/−/全体表示ボタン、Ctrl/⌘＋ホイールズーム（カーソル位置の年が固定されること）、ズームインで目盛が 500年→100年→50年→10年 と細かくなること。可能ならスマホ実機かデバイスモードでピンチズームも確認。

- [ ] **Step 7: コミット**

```bash
git add src/components
git commit -m "feat: add continuous zoom with anchor preservation and controls"
```

---

### Task 17: 選択と詳細パネル

**Files:**
- Create: `src/components/DetailPanel.tsx`
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/DetailPanel.test.tsx`、`src/components/TimelinePage.test.tsx`（追記）

**Interfaces:**
- Consumes: `findContemporaries`（Task 10）、`formatSpan`（Task 4）、`Dataset` / `Entry`（Task 2）
- Produces: `DetailPanel({ entry, dataset, onSelect, onClose }: { entry: Entry; dataset: Dataset; onSelect: (id: string) => void; onClose: () => void })`。PC では右サイドパネル・スマホでは下部シート（Tailwind の `md:` ブレークポイントで切替）。選択エントリへのジャンプは `TimelinePage` の `jumpToEntry(id)` が行う（エントリ開始年が画面中央に来るよう `scrollTop` を設定）

- [ ] **Step 1: DetailPanel の失敗するテストを書く**

`src/components/DetailPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { DetailPanel } from './DetailPanel'

const edward = testDataset.entries.find(e => e.id === 'edward-1')
if (!edward) throw new Error('fixture missing')

test('名前・期間・種別・所属・解説を表示する', () => {
  render(<DetailPanel entry={edward} dataset={testDataset} onSelect={() => {}} onClose={() => {}} />)
  expect(screen.getByRole('heading', { name: 'エドワード1世' })).toBeInTheDocument()
  expect(screen.getByText(/1272年〜1307年/)).toBeInTheDocument()
  expect(screen.getByText(/統治者/)).toBeInTheDocument()
  expect(screen.getByText(/イングランド/)).toBeInTheDocument()
  expect(screen.getByText('テスト用エントリ。')).toBeInTheDocument()
})

test('同時代リストに他地域のエントリを表示する', () => {
  render(<DetailPanel entry={edward} dataset={testDataset} onSelect={() => {}} onClose={() => {}} />)
  const list = screen.getByRole('list', { name: '同時代' })
  expect(list).toHaveTextContent('フビライ・ハン')
  expect(list).toHaveTextContent('北条時宗')
  expect(list).not.toHaveTextContent('フィリップ4世')
})

test('同時代エントリのクリックで onSelect が呼ばれる', async () => {
  const onSelect = vi.fn()
  render(<DetailPanel entry={edward} dataset={testDataset} onSelect={onSelect} onClose={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /フビライ・ハン/ }))
  expect(onSelect).toHaveBeenCalledWith('kublai-khan')
})

test('閉じるボタンで onClose が呼ばれる', async () => {
  const onClose = vi.fn()
  render(<DetailPanel entry={edward} dataset={testDataset} onSelect={() => {}} onClose={onClose} />)
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
  expect(onClose).toHaveBeenCalled()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/components/DetailPanel.test.tsx`
Expected: FAIL（`./DetailPanel` が存在しない）

- [ ] **Step 3: DetailPanel を実装する**

`src/components/DetailPanel.tsx`:

```tsx
import type { Dataset, Entry } from '../data/schema'
import { findContemporaries } from '../domain/contemporaries'
import { formatSpan, formatYear } from '../domain/format'

const TYPE_LABEL: Record<Entry['type'], string> = {
  ruler: '統治者',
  person: '人物',
  event: '事件',
}

type Props = {
  entry: Entry
  dataset: Dataset
  onSelect: (id: string) => void
  onClose: () => void
}

export function DetailPanel({ entry, dataset, onSelect, onClose }: Props) {
  const contemporaries = findContemporaries(entry, dataset.entries, dataset.regions)
  const regionName = (id: string) => dataset.regions.find(r => r.id === id)?.name ?? id
  const meta = [TYPE_LABEL[entry.type], entry.groupName, formatSpan(entry.start, entry.end)]
    .filter(Boolean)
    .join(' ・ ')

  return (
    <aside
      aria-label="詳細"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[50dvh] overflow-y-auto rounded-t-xl border border-line bg-panel p-4 shadow-lg md:inset-x-auto md:top-0 md:right-0 md:h-dvh md:max-h-none md:w-80 md:rounded-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{entry.title}</h2>
        <button
          type="button"
          aria-label="閉じる"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{meta}</p>
      <p className="mt-3 text-sm leading-relaxed">{entry.description}</p>
      {contemporaries.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-medium text-muted">同時代</h3>
          <ul aria-label="同時代" className="mt-1">
            {contemporaries.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                  onClick={() => onSelect(c.id)}
                >
                  {c.title}
                  <span className="ml-1 text-xs text-muted">
                    （{regionName(c.region)} ・ {formatYear(c.start)}〜）
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: DetailPanel のテストが通ることを確認**

Run: `pnpm vitest run src/components/DetailPanel.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: TimelinePage に統合する（失敗するテスト → 実装）**

`src/components/TimelinePage.test.tsx` に追記:

```tsx
test('バーをクリックすると詳細パネルが開き、閉じるで消える', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  expect(screen.getByRole('complementary', { name: '詳細' })).toBeInTheDocument()
  expect(screen.getByText('テスト用エントリ。')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
  expect(screen.queryByRole('complementary', { name: '詳細' })).not.toBeInTheDocument()
})

test('同時代リンクで選択が移動する', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.click(screen.getByRole('button', { name: /エドワード1世/ }))
  const list = screen.getByRole('list', { name: '同時代' })
  await userEvent.click(within(list).getByRole('button', { name: /フビライ・ハン/ }))
  expect(screen.getByRole('heading', { name: 'フビライ・ハン' })).toBeInTheDocument()
})
```

（`within` を `@testing-library/react` からの import に追加する。タイムライン上のバーと同時代リストのボタンが同名になるため、リスト内に限定して取得する）

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 追記した2件が FAIL

`src/components/TimelinePage.tsx` に統合する。追加・変更点:

```tsx
import { DetailPanel } from './DetailPanel'

  const selectedEntry = useMemo(
    () => entries.find(e => e.id === selectedId) ?? null,
    [entries, selectedId],
  )

  const jumpToEntry = useCallback(
    (id: string) => {
      const entry = entries.find(e => e.id === id)
      if (!entry) return
      setSelectedId(id)
      setZoom(prev => ({
        ...prev,
        scrollTop: Math.max(
          0,
          (entry.start - config.minYear) * prev.pxPerYear - viewportHeight / 2,
        ),
      }))
    },
    [entries, config.minYear, viewportHeight],
  )
```

JSX の `<ZoomControls … />` の直後（同じラッパー `div` 内）に追加:

```tsx
      {selectedEntry && (
        <DetailPanel
          entry={selectedEntry}
          dataset={dataset}
          onSelect={jumpToEntry}
          onClose={() => setSelectedId(null)}
        />
      )}
```

- [ ] **Step 6: 全テストが通ることを確認**

Run: `pnpm test`
Expected: すべて PASS

- [ ] **Step 7: dev サーバーで目視確認**

Run: `pnpm dev`
確認: バークリックで PC は右パネル・レスポンシブモード（幅 < 768px）では下部シートになる。同時代リンクで対象へスクロール＆選択が移る。

- [ ] **Step 8: コミット**

```bash
git add src/components
git commit -m "feat: add detail panel with contemporaries navigation"
```

---

### Task 18: 検索・年代ジャンプ

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/components/TimelinePage.tsx`
- Test: `src/components/SearchBar.test.tsx`、`src/components/TimelinePage.test.tsx`（追記）

**Interfaces:**
- Consumes: `parseQuery` / `searchEntries`（Task 9）、`formatSpan`（Task 4）、`jumpToEntry`（Task 17）
- Produces: `SearchBar({ entries, onJumpToYear, onSelectEntry }: { entries: Entry[]; onJumpToYear: (year: number) => void; onSelectEntry: (id: string) => void })`。入力欄の aria-label は「検索」、年入力時は Enter でジャンプ、名前入力時は候補リスト（`role="listbox"`）を表示

- [ ] **Step 1: SearchBar の失敗するテストを書く**

`src/components/SearchBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { testDataset } from '../test/fixtures'
import { SearchBar } from './SearchBar'

test('名前入力で候補を表示し、選択で onSelectEntry が呼ばれる', async () => {
  const onSelectEntry = vi.fn()
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={() => {}} onSelectEntry={onSelectEntry} />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), 'マルコ')
  await userEvent.click(screen.getByRole('option', { name: /マルコ・ポーロ/ }))
  expect(onSelectEntry).toHaveBeenCalledWith('marco-polo')
})

test('年入力で Enter するとジャンプする', async () => {
  const onJumpToYear = vi.fn()
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={onJumpToYear} onSelectEntry={() => {}} />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '1300{Enter}')
  expect(onJumpToYear).toHaveBeenCalledWith(1300)
})

test('「前300」で紀元前にジャンプする', async () => {
  const onJumpToYear = vi.fn()
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={onJumpToYear} onSelectEntry={() => {}} />,
  )
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), '前300{Enter}')
  expect(onJumpToYear).toHaveBeenCalledWith(-300)
})

test('候補選択後は入力と候補がクリアされる', async () => {
  render(
    <SearchBar entries={testDataset.entries} onJumpToYear={() => {}} onSelectEntry={() => {}} />,
  )
  const input = screen.getByRole('searchbox', { name: '検索' })
  await userEvent.type(input, 'マルコ')
  await userEvent.click(screen.getByRole('option', { name: /マルコ・ポーロ/ }))
  expect(input).toHaveValue('')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `pnpm vitest run src/components/SearchBar.test.tsx`
Expected: FAIL（`./SearchBar` が存在しない）

- [ ] **Step 3: SearchBar を実装する**

`src/components/SearchBar.tsx`:

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
  const query = useMemo(() => parseQuery(input), [input])
  const candidates = useMemo(
    () => (query.kind === 'name' ? searchEntries(entries, query.text) : []),
    [entries, query],
  )

  return (
    <div className="fixed top-2 left-1/2 z-30 w-72 -translate-x-1/2">
      <input
        type="search"
        aria-label="検索"
        placeholder="名前か年（例: 1300 / 前300）"
        className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-sm"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && query.kind === 'year') {
            onJumpToYear(query.year)
            setInput('')
          }
        }}
      />
      {candidates.length > 0 && (
        <ul
          role="listbox"
          aria-label="検索候補"
          className="mt-1 overflow-hidden rounded-md border border-line bg-panel shadow-lg"
        >
          {candidates.map(entry => (
            <li key={entry.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface"
                onClick={() => {
                  onSelectEntry(entry.id)
                  setInput('')
                }}
              >
                {entry.title}
                <span className="ml-1 text-xs text-muted">
                  {formatSpan(entry.start, entry.end)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: SearchBar のテストが通ることを確認**

Run: `pnpm vitest run src/components/SearchBar.test.tsx`
Expected: PASS（4 tests）

- [ ] **Step 5: TimelinePage に統合する（失敗するテスト → 実装）**

`src/components/TimelinePage.test.tsx` に追記:

```tsx
test('検索候補の選択で詳細パネルが開く', async () => {
  render(<TimelinePage dataset={testDataset} />)
  await userEvent.type(screen.getByRole('searchbox', { name: '検索' }), 'マルコ')
  await userEvent.click(screen.getByRole('option', { name: /マルコ・ポーロ/ }))
  expect(screen.getByRole('heading', { name: 'マルコ・ポーロ' })).toBeInTheDocument()
})
```

Run: `pnpm vitest run src/components/TimelinePage.test.tsx`
Expected: 追記分が FAIL

`src/components/TimelinePage.tsx` に統合する。追加・変更点:

```tsx
import { SearchBar } from './SearchBar'

  const jumpToYear = useCallback(
    (year: number) => {
      setZoom(prev => ({
        ...prev,
        scrollTop: Math.max(
          0,
          (year - config.minYear) * prev.pxPerYear - viewportHeight / 2,
        ),
      }))
    },
    [config.minYear, viewportHeight],
  )
```

JSX のラッパー `div` 内・`<TimelineView …>` の前に追加:

```tsx
      <SearchBar entries={entries} onJumpToYear={jumpToYear} onSelectEntry={jumpToEntry} />
```

- [ ] **Step 6: 全テスト・全チェックを確認**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: すべて PASS

- [ ] **Step 7: dev サーバーで目視確認**

Run: `pnpm dev`
確認: 「エドワード」で候補が出て選択でジャンプ＆パネル表示、「1300」Enter で13世紀末へ、「前300」Enter で古代へ移動する。

- [ ] **Step 8: コミット**

```bash
git add src/components
git commit -m "feat: add name search and year jump"
```

---

### Task 19: 初期データセット拡充

**Files:**
- Modify: `public/data/entries.json`

**Interfaces:**
- Consumes: スキーマ制約（Task 2）、`pnpm validate-data`（Task 3）
- Produces: 8地域 × 全時代で 150〜300 エントリのデータセット

**選定基準:**

- 世界史の教科書・用語集レベルで頻出の統治者・人物・事件を優先する
- importance 1: 時代の骨格となる存在（アレクサンドロス、始皇帝、ムハンマド、チンギス・ハン、ナポレオン等）。全体で 40〜60 件
- importance 2: 主要な王・皇帝・教皇・戦争・条約。全体で 100〜200 件
- importance 3 はこの段階では追加しない（ズーム全域の表示確認は 1〜2 で足りる）
- 各地域に必ず古代・中世・近世・近代のエントリを置く（レーンが長期間空にならないように）
- 同一 group 内の在位は連続させ、group の代表的な区切り（王朝交代）で group を分ける
- `description` は教科書レベルの周知の事実を1〜2文で自作する。既存書籍からの転載をしない

各バッチの後に `pnpm validate-data` と `pnpm dev` での目視確認を行い、レーン幅の爆発（サブカラム過多）や特定時代の過密がないかを確認する。

- [ ] **Step 1: バッチ1 — 古代（前3000〜500年頃）を追加**

対象の目安: エジプト（新王国など代表2〜3件）、メソポタミア（ハンムラビ）、アケメネス朝（キュロス2世・ダレイオス1世）、ギリシア（ペルシア戦争・アレクサンドロス）、ローマ（カエサル・アウグストゥス・コンスタンティヌス・西ローマ滅亡）、マウリヤ朝（アショーカ王）、グプタ朝、秦漢（始皇帝・武帝）、三国〜南北朝の代表、日本（卑弥呼・古墳時代）、アメリカ（オルメカ・テオティワカン）など約40〜60件。

Run: `pnpm validate-data && pnpm test`
Expected: `OK: 8 regions, <件数> entries`、テストすべて PASS

```bash
git add public/data/entries.json
git commit -m "data: add ancient era entries"
```

- [ ] **Step 2: バッチ2 — 中世（500〜1500年頃）を追加**

対象の目安: フランク王国（カール大帝）、神聖ローマ（オットー1世・カノッサの屈辱）、英仏（ノルマン征服・百年戦争・主要国王）、教皇（グレゴリウス7世・インノケンティウス3世）、ビザンツ（ユスティニアヌス・帝国滅亡）、イスラーム（ムハンマド・正統カリフ・ウマイヤ朝・アッバース朝・オスマン朝成立）、モンゴル（チンギス〜フビライ・各ハン国）、隋唐宋元明の主要皇帝、デリー・スルタン朝、日本（大化の改新・源頼朝・元寇・室町）、アメリカ（マヤ・アステカ・インカ）など約60〜90件。

Run: `pnpm validate-data && pnpm test`
Expected: すべて PASS

```bash
git add public/data/entries.json
git commit -m "data: add medieval era entries"
```

- [ ] **Step 3: バッチ3 — 近世・近代・現代（1500年頃〜）を追加**

対象の目安: 大航海時代（コロンブス・マゼラン）、宗教改革（ルター・カルヴァン）、絶対王政（カルロス1世・フェリペ2世・ルイ14世・エリザベス1世）、三十年戦争、イギリス革命・アメリカ独立・フランス革命、ナポレオン、ウィーン体制、産業革命、明清（康熙帝・乾隆帝・アヘン戦争）、ムガル帝国（アクバル・アウラングゼーブ）、オスマン帝国（スレイマン1世）、日本（信長・秀吉・家康・明治維新）、二度の世界大戦、冷戦の主要事件など約60〜90件。

Run: `pnpm validate-data && pnpm test`
Expected: すべて PASS。合計エントリ数が 150〜300 の範囲

```bash
git add public/data/entries.json
git commit -m "data: add early modern and modern era entries"
```

- [ ] **Step 4: 全時代の目視確認**

Run: `pnpm dev`
確認: 全体表示で各レーンに importance 1 の骨格が見え、ズームインで importance 2 が現れる。どのレーンもサブカラムが4本を超えて幅が爆発していない（超える場合は group の分け方を見直すか importance を調整する）。

---


### Task 20: CI・Cloudflare Workers デプロイ

**Files:**
- Create: `.github/workflows/ci.yml`, `wrangler.jsonc`
- Modify: `package.json`

**Interfaces:**
- Consumes: `pnpm validate-data` / `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build`（Task 1・3）
- Produces: PR ごとの CI、main マージでの Cloudflare Workers 自動デプロイ、`pnpm deploy`（ローカルからの手動デプロイ）

ホスティングは Cloudflare Workers の静的アセット配信（Worker スクリプトを持たないアセットのみの Worker）。デプロイ設定は `wrangler.jsonc` に集約し、Cloudflare 側に置くのは認証情報のみとする。

- [ ] **Step 1: wrangler を追加し設定ファイルを書く**

```bash
pnpm add -D wrangler
```

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "world-history-timeline",
  "compatibility_date": "2026-07-04",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

`package.json` の scripts に追加:

```json
{
  "scripts": {
    "deploy": "pnpm build && wrangler deploy"
  }
}
```

- [ ] **Step 2: dry-run でデプロイ設定を検証する**

Run: `pnpm build && pnpm wrangler deploy --dry-run`
Expected: dist のアセットが認識され、`--dry-run: exiting now.` で正常終了する（認証不要）

- [ ] **Step 3: ワークフローを書く**

`.github/workflows/ci.yml`:

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
      - if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`cloudflare/wrangler-action` の `command` はデフォルトで `deploy`（= `wrangler deploy`）。deploy ジョブの checkout は `wrangler.jsonc` を参照するために必要。

`pnpm/action-setup@v4` はバージョン指定なしで `package.json` の `packageManager` フィールドを参照するため、`package.json` に `packageManager`（例: `"packageManager": "pnpm@10.0.0"`、ローカルの `pnpm --version` に合わせる）があることを確認し、なければ追加する。

- [ ] **Step 4: ローカルで全チェックを流してコミット・プッシュ**

Run: `pnpm validate-data && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: すべて成功

```bash
git add .github wrangler.jsonc package.json pnpm-lock.yaml
git commit -m "ci: add github actions workflow with cloudflare workers deploy"
git push -u origin main
```

- [ ] **Step 5: Cloudflare 認証情報の設定とデプロイ確認（要ユーザー対話）**

リポジトリ側で管理できない唯一の要素が認証情報。ユーザーに以下を依頼する:

1. Cloudflare ダッシュボード → My Profile → API Tokens で「Edit Cloudflare Workers」テンプレートからトークンを作成
2. アカウント ID を確認（ダッシュボードの Workers & Pages 概要ページ、または `pnpm wrangler whoami`）
3. GitHub Secrets に登録:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

Actions の実行が成功したら `https://world-history-timeline.<アカウントのサブドメイン>.workers.dev` を開き、タイムラインが表示されること・`data/*.json` の fetch が成功することを確認する。

独自ドメインを使う場合も `wrangler.jsonc` の `routes`（`custom_domain: true`）で設定ファイル管理できる（MVP では workers.dev のままでよい）。

---

### Task 21: README（英語）と CLAUDE.md

**Files:**
- Create: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: これまでの全タスクの成果（コマンド・ディレクトリ構成・規約）
- Produces: 英語の README、エージェント向け開発ガイド CLAUDE.md（いずれも英語）

- [ ] **Step 1: README を書く**

`README.md`:

```markdown
# World History Timeline

A timeline app for grasping the "who, when, where" of world history at a glance.
Regional lanes share a single vertical time axis, so you can see what was
happening across the world at the same moment — rulers, notable figures, and
events side by side.

## Development

​```bash
pnpm install
pnpm dev
​```

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm test` | Run tests |
| `pnpm validate-data` | Validate timeline data |
| `pnpm build` | Validate data, type-check, and build |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |

## Adding data

Add entries to `public/data/entries.json` and run `pnpm validate-data`.
The schema lives in `src/data/schema.ts`. Years are integers; BC years are
negative (300 BC → `-300`). Design docs are under `docs/superpowers/specs/`.

## Deployment

Deployed to Cloudflare Workers as an assets-only Worker. All deploy
configuration lives in `wrangler.jsonc`; CI deploys on every push to `main`
via `cloudflare/wrangler-action` (requires `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in GitHub Secrets).
```

（README 内のコードフェンスは通常のバッククォート3つで書く）

- [ ] **Step 2: CLAUDE.md を書く**

`CLAUDE.md`（コマンド → アーキテクチャ → 規約の順で、簡潔に保つ）:

```markdown
# CLAUDE.md

Timeline app that visualizes the synchronicity of world history: regional
lanes on a shared vertical time axis. Static SPA (Vite + React + TypeScript)
served from Cloudflare Workers static assets.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm vitest run <path>` | Run a single test file |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | tsc / Biome check / Biome format |
| `pnpm validate-data` | Validate timeline data against schemas |
| `pnpm build` | validate-data + typecheck + vite build |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |

## Architecture

- `src/domain/` — pure functions with no React dependency (scale, group
  packing, ticks, importance filtering, query parsing, contemporaries,
  zoom math). Start logic changes from the tests here.
- `src/components/` — SVG rendering and UI. All state is orchestrated in
  `TimelinePage`.
- `src/data/` — zod schemas (`schema.ts` is the single source of truth for
  types), cross-dataset validation, fetching.
- `public/data/*.json` — the timeline data itself. `scripts/validate-data.ts`
  validates it in CI and before every build.

## Conventions

- Years are integers only; BC years are negative (300 BC → `-300`). All
  display formatting goes through `src/domain/format.ts`.
- Entries: `ruler` / `person` require `end`; only `event` may omit it
  (point event). `group` requires `groupName`.
- Color ownership: region colors are data (`public/data/regions.json`);
  UI colors are design tokens (`DESIGN.md` → `@theme` in `src/index.css`).
  Do not blur this boundary.
- UI copy is Japanese; commit messages are English (conventional commits).
- Domain modules always get unit tests; UI is covered by RTL tests on the
  main flows.
```

- [ ] **Step 3: コミット**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add english readme and claude.md"
```

---

## 実行順序とチェックポイント

- Task 1〜12 は依存順（1 → 2 → 3 → …）。Task 4〜11 のドメイン層は相互独立なので並列実行も可
- Task 13（デザイン）は Task 1 完了後ならいつでも着手できるが、Task 14 より前に完了していること（Task 14 以降の UI がトークンを参照するため）
- Task 13 Step 5（Claude Design レビュー）と Task 20 Step 5（Cloudflare 認証情報の設定）はユーザー対話が必要
- Task 21（README・CLAUDE.md）は最後に実施する（全タスクの成果を反映するため）
- 各タスク完了時に `pnpm typecheck && pnpm lint && pnpm test` が通っていることをコミット前に確認する
