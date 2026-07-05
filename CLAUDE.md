# CLAUDE.md

世界史の同時代性を可視化する年表アプリ。地域レーンが1本の縦時間軸を共有する。
Vite + React + TypeScript の静的 SPA で、Cloudflare Workers の静的アセットとして配信する。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバー |
| `pnpm test` | 全テスト実行（Vitest） |
| `pnpm vitest run <path>` | 単一テストファイルの実行 |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | tsc / Biome check / Biome format |
| `pnpm validate-data` | 年表データのスキーマ検証 |
| `pnpm build` | validate-data + typecheck + vite build |
| `pnpm deploy:cf` | ビルドして Cloudflare Workers にデプロイ |

## アーキテクチャ

- `src/domain/` — React 非依存の純粋関数（スケール、group パッキング、目盛、
  importance フィルタ、検索解釈、同時代抽出、ズーム計算、年表示整形）。
  ロジック変更はまずここのテストから始める
- `src/components/` — SVG 描画と UI。状態は `TimelinePage` に集約されている
- `src/data/` — zod スキーマ（`schema.ts` が型の一次情報）、横断検証、fetch
- `public/data/*.json` — 年表データの正。`scripts/validate-data.ts` が CI と
  ビルド前に検証する

## 規約

- 年は整数のみ。紀元前は負数（前300年 → `-300`）。表示変換は
  `src/domain/format.ts` に集約する
- エントリ: `ruler` / `person` は `end` 必須。`event` のみ省略可（点イベント）。
  `group` には `groupName` が必須
- 色の責務: 地域色はデータ（`public/data/regions.json`）、UI の色はデザイン
  トークン（`DESIGN.md` → `src/index.css` の `@theme`）。この境界を崩さない
- UI 文言は日本語、コミットメッセージは英語（conventional commits）
- ドメイン層は必ず単体テスト。UI は主要動線を RTL でカバーする

## データ作成（public/data/entries.json）

- 解説文は日本語・常体・1〜2文で自作する。教科書レベルの周知の客観的事実に基づき、
  書籍やウェブサイトからの転載はしない
- 網羅より正確性。学習教材なので誤った年代は本末転倒。教科書標準と確信できる
  年代だけを使い、不確かなら別のよく知られた人物・事件を選ぶ
- 統治者の年代は即位〜退位/死去。人物は歴史的に意味のある活動期間
- `importance`: 1 = 時代の骨格（全体で40〜60件に抑える）、2 = 主要な王・教皇・
  戦争・条約、3 = 深いズームでのみ表示される詳細
- 同一王朝・国家の統治者は同じ `group`（同じ縦ラインに積まれる）。1地域内で
  同時期に重なる group は3つ程度まで（レーン幅の爆発防止）
- データ編集のたびに `pnpm validate-data` を実行する
