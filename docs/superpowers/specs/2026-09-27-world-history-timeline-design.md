# 世界史年表 設計書（MVP）

- 作成日: 2026-09-27
- 状態: レビュー待ち

## 1. 目的と利用者

受験生・学習者が、世界史の流れ（同じ国・地域の王朝や王の移り変わり）と、同じ時代に別の地域で何が起きていたかを、年表で確かめられる Web アプリ。一般に公開するので、モバイル対応は MVP に含める。

ユースケース:

- 同じ国・地域の王朝の変遷を年表で確認する
- 画面外の年表をスクロールで見る
- 年表の主題（王朝／王）を切り替える
- 年表の向き（縦／横）を切り替える。縦は時代の流れを長く見渡すのに、横は多くの地域を同時代で見比べるのに向く

成功の基準:

- 主題と向きの 4 通りすべてで、MVP のデータが欠けや重なりなく表示される
- PC とスマートフォンの実ブラウザで、スクロールと 2 つの切り替えが問題なく動く
- 主題や向きを切り替えても、見ていた年のあたりが表示され続ける

## 2. スコープ

### MVP に含めるもの

- 年表の行（国・地域）: 「フランク王国・フランス」「イングランド」の 2 行
- 主題: 王朝と王（在位）。データの中身は data リポの spec で決める
- 主題の切り替え、向きの切り替え、スクロール

### MVP に含めないもの

- 戦い・戦争・教皇などほかの主題、ほかの地域
- ズーム、棒をタップしたときの詳細表示、検索
- 生没年・地位（「イングランド王」など）の表示
- 地域の階層（ヨーロッパ ＞ 西ヨーロッパ ＞ …）による絞り込み
- E2E テスト（UI は実ブラウザで確認する）
- 独自ドメイン（まず workers.dev で公開する）
- §6 の「UI 文言」に載っていない文言。meta description、OGP、favicon、robots.txt も作らない

## 3. 画面と操作

画面は 1 つだけ。上部の左に主題のセレクト（「王朝／王」）、右に向きの切り替えボタン（「縦／横」）を置き、その下を年表が占める。主題は今後増えていくので、数によらず 1 段に収まるネイティブのセレクトにする（スマートフォンでは OS の選択画面が出る）。向きはどう並べるかを選ぶ表示の設定なので、棒の並ぶ向きを描いたアイコンのボタンにし、選んだ側に下線と薄い地を付ける。どちらも指で押しやすいよう高さ 44px にする。色・書体・ダークモードの扱いは DESIGN.md で決め、実装の前に HTML モックを Artifact で公開してデザインレビューを受ける（要ユーザー対話）。

### 3.1 年表

- **縮尺**: 縦も横も 1 年 = 2px で固定する。MVP ではズームしない
- **範囲**: データの最も古い年から最も新しい年までに前後の余白を足した範囲。目盛りは 100 年ごと
- **固定表示**: 年の目盛りと行の名前はスクロールしても画面の端に残る
  - 縦: 行の名前が上端（列見出し）、年が左端
  - 横: 年が上端、行の名前が左端
- **棒**: 名前と「開始–終了」を出す。年の形式は §6
- **棒の中の文字**: 横は名前と期間を 2 行に積む。縦は「名前 期間」を 1 行にし、列の幅に収まらない分は省略記号で切る
- **収まらない名前**: 横は棒の長さが名前か期間の幅に足りないとき、縦は棒の長さが 1 行分（18px）に足りないときに、名前（1 行目）と期間（2 行目）を積んだラベルを棒の外（横なら下、縦なら右）に出す。同じ行でラベルどうしが重なるなら段をずらす。幅は、フォントを読み込んだ後に棒の文字と同じフォントで測る（canvas の `measureText`）。MVP のデータで棒の外に出るのは横のときだけ
- **期間が重なるとき**: 同じ行の中で期間が重なる棒は段を分けて並べる（MVP のデータでは起きないが、南北朝などに備える）
- 縦の各行（列）の幅は、画面幅から年の列を除いた幅を行数で等分する。行が増えて 1 列が狭くなりすぎる場合の扱いは、行を増やすときに決める

### 3.2 操作

- **初期の向き**: 開いたときの画面が横長（幅 > 高さ）なら横、そうでなければ縦。以後はボタンでだけ変わり、画面を回転しても自動では変えない
- **初期位置**: データの最初（481 年のあたり）を表示する
- **中央の年を保つ**: 主題や向きを切り替えたら、切り替え前に画面中央にあった年が中央に来るようにスクロール位置を合わせる
- 棒をタップしても何も起きない
- 主題はネイティブの `select` にし、`aria-label`（§6）を付ける。向きは `aria-pressed` 付きのトグルボタンを `role="group"` と `aria-label`（§6）でまとめ、アイコンだけのボタンは §6 の名前を `aria-label` と `title` に入れる。年表の領域はフォーカスでき、キーボードでスクロールできる

### 3.3 読み込み中とエラー

- データを読み込むまで「読み込み中」を表示する
- 読み込みや検証に失敗したら、エラーの文言を表示する（§6）。部分的な表示はしない

## 4. データ

データの調査・整形は akihiro-tj/world-history-timeline-data（private）で行い、その成果物だけをこのリポに置く。データの作り方と MVP のデータの中身は、data リポの spec で決める。

### 4.1 概念と多重度

```
行 ──多対多── 王朝
行 ──多対多── 在位 ──多対1── 人物
```

- **行**: 年表の 1 行（系統）。地理の区切りではなく、表示のうえでの編集判断として持つ。同じ王朝や在位を複数の行に置ける（将来、カロリング朝をフランス行と東フランク・ドイツ行の両方に置く、など）
- **王朝**: 名前と期間。どの行に出すかは持たない
- **人物**: 名前
- **在位**: 人物と期間。1 人が複数の在位を持てる（将来、クヌートのイングランド王とデンマーク王、など）
- 在位から王朝への関係は持たない。王の棒を王朝ごとに色分けしたくなったら、在位 → 王朝（多対 0..1）を足す

### 4.2 成果物（`src/data/timeline.json`）

data リポの `pnpm copy` がこのリポの `src/data/timeline.json` に置き、このリポでコミットする。

```ts
type Year = { year: number; circa: boolean }; // 「465頃」→ { year: 465, circa: true }。紀元前は負の数（前221年 → -221）

type TimelineData = {
  lanes: { id: string; name: string; dynasties: string[]; reigns: string[] }[]; // 配列の順が表示の順
  dynasties: { id: string; name: string; start: Year; end: Year }[];
  people: { id: string; name: string }[];
  reigns: { id: string; personId: string; start: Year; end: Year }[];
};
```

- アプリは `import timelineUrl from "./timeline.json?url"` でハッシュ付きの URL を得て、起動時に fetch する。JS にはバンドルしないので、データを更新しても JS のキャッシュが無効にならず、件数が増えても初期表示の JS が大きくならない
- Vite は小さいアセットを data URL にインライン化するので、このファイルは `build.assetsInlineLimit` で対象から外す
- アプリは受け取った JSON を厳密に検証する。知らないキー、欠けたキー、型の違い、存在しない参照、開始 > 終了があれば読み込まずにエラーにする
- 成果物の形を変えるときは、data リポとこのリポを合わせて変える

### 4.3 MVP のデータの規模

- 行: 「フランク王国・フランス」「イングランド」の 2 行
- 王朝 10 件、人物 19 人、在位 19 件（期間はおおよそ 481〜1603 年）

## 5. アーキテクチャ

### 5.1 リポジトリ

| リポ | 可視性 | 役割 |
|---|---|---|
| akihiro-tj/world-history-timeline | public | アプリ。main はルールセットで守る |
| akihiro-tj/world-history-timeline-data | private | データの調査・整形（構成は data リポの spec） |

### 5.2 アプリ

- Vite、React 19、TypeScript、Tailwind v4、Biome、Vitest（node 環境）。版は world-history-map に揃え、着手時の最新安定版を確かめて固定する（lockfile も固定）
- ランタイムは nix の devShell（Node 24）と `.node-version` で固定する。pnpm は `packageManager` で固定する
- house-rules から APM で core・web-react・cloudflare-workers・github-actions を入れる。executables の allow/deny は house-rules の README のとおり。`.github/dependabot.yml` と `.gitignore` は house-rules の templates/ からコピーする
- `index.html` には `lang="ja"`、viewport、§6 の `<title>` だけを入れる

| ファイル | 役割 |
|---|---|
| `src/data/timeline.ts` | 型と成果物 JSON の厳密な検証 |
| `src/data/loadTimeline.ts` | 成果物の取得と検証 |
| `src/timeline/format.ts` | 年の表示形式 |
| `src/timeline/spans.ts` | 主題（王朝／王）ごとに、行に並べる棒の元データを取り出す |
| `src/timeline/layout.ts` | 向きに依存しない計算（純粋関数）。年 → 位置、範囲と目盛り、期間が重なるときの段分け、棒の外に出すラベルの段決め（文字幅を測る関数は引数で受け取る） |
| `src/timeline/scroll.ts` | 向きの初期値と、切り替えの前後で中央の年を保つ計算（純粋関数） |
| `src/timeline/useTextMeasure.ts` | フォントの読み込み後に、棒の文字と同じフォントで文字幅を測る |
| `src/timeline/Timeline.tsx` | 計算結果を縦か横に当てはめて描画し、切り替えの後に中央の年へスクロールする |
| `src/app/App.tsx`・`src/app/SubjectSelect.tsx`・`src/app/ToggleGroup.tsx`・`src/app/icons.tsx` | 読み込み・エラー、主題のセレクト、向きの切り替え（アイコン） |
| `src/app/copy.ts` | UI 文言 |

### 5.3 配信

- Workers の静的アセットだけで配信する（Worker スクリプトなし）。地図がないので R2・PMTiles・Range 配信は使わない
- `public/_headers` で `/assets/*`（Vite のハッシュ付きファイル。`timeline.json` を含む）に `Cache-Control: public, max-age=31536000, immutable` を付ける。`index.html` は既定（再検証）のまま
- **最序盤のスパイク（必須）**: 最初のデプロイ直後に実機で次を確かめる
  1. Worker スクリプトのない構成で house-rules の `wrangler-preview` が動き、URL が返る
  2. `_headers` が本番とプレビューの両方で効く
- **フォールバック**: どちらかがだめなら、`env.ASSETS.fetch` に渡すだけの最小の Worker（`src/worker/`）を置き、キャッシュのヘッダーはその Worker で付ける

#### スパイクの結果（2026-09-27、PR #1）

| 確認したこと | 結果 | 対応 |
|---|---|---|
| Worker スクリプトのない構成での `wrangler preview` | 最初は「Your Wrangler configuration is missing a previews block」で失敗した。`wrangler.jsonc` に空の `previews` ブロックを足すと、プレビューを作成でき、URL の PR コメントも付いた | `previews: {}` を足した。フォールバックの Worker は不要 |
| `_headers` がプレビューで効くか | スモークテストが成功した（JS と年表データに `immutable` が付く） | 変更なし |
| プレビュー URL の形式 | `https://pr-<番号>-world-history-timeline.akihiro-tj.workers.dev` | なし |
| 失敗時のログ | house-rules の `wrangler-preview` は、失敗すると wrangler の出力を表示しない | `preview.yml` に失敗時だけ `preview.log` を表示するステップを足した |
| 本番で `_headers` が効くか | 未確認（main にマージした後の `Deploy` のスモークテストで確かめる） | なし |

### 5.4 非機能要件

- 初期 JS は gzip 後 100KB 以下を目標にする。CI でサイズを出力するが、失敗にはしない。年表やチャートのライブラリは入れない
- データは約 50 件（数 KB）。将来の数百〜千件（gzip 後 20KB 程度）でも同じ読み込み方で足りる

### 5.5 CI とデプロイ

| ワークフロー | 内容 |
|---|---|
| `ci.yml`（ジョブ名 `Check and build`） | `biome ci`、型チェック、テスト、`design.md lint DESIGN.md`、`pnpm tokens` の差分確認、ビルド、初期 JS のサイズ出力、`wrangler deploy --dry-run` |
| `preview.yml` | house-rules の `wrangler-preview`（作成・URL のコメント）と `wrangler-preview-delete`（PR を閉じたら削除）。デプロイ後にスモークテスト |
| `deploy.yml` | main への push で本番にデプロイし、スモークテスト |
| `apm-update.yml` | house-rules の reusable workflow |

- `scripts/smoke.sh`: トップページが返る、トップページが参照する JS から `timeline.json` の URL を見つけて取得できる、JS と `timeline.json` の応答に `immutable` が付いている、を確かめる。作業環境からは workers.dev に接続できないので、ワークフローの中で実行する
- 本番の URL は `https://world-history-timeline.akihiro-tj.workers.dev`
- DESIGN.md は https://github.com/google-labs-code/design.md/blob/main/docs/spec.md に則って書き、`pnpm tokens`（`@google/design.md export --format css-tailwind`）で Tailwind v4 の `@theme` CSS を生成する

### 5.6 ブランチ保護

house-rules の `rulesets/main.json` を `scripts/apply-ruleset.sh` で適用する。CI のジョブが一度動いた後に、ユーザーが次を実行する（要ユーザー対話）。

```sh
bash scripts/apply-ruleset.sh akihiro-tj/world-history-timeline "Check and build"
```

## 6. UI 文言

| 場所 | 文言 |
|---|---|
| `<title>` | 世界史年表 |
| 主題の選択 | 王朝 ／ 王（セレクトの選択肢。セレクトの `aria-label`: 主題） |
| 向きの切り替え | 縦 ／ 横（アイコンのボタンの `aria-label` と `title`。グループの `aria-label`: 向き） |
| 年表の領域の `aria-label` | 年表 |
| 行の名前（データ） | フランク王国・フランス ／ イングランド |
| 読み込み中 | 読み込み中… |
| エラー | 年表のデータを読み込めませんでした。ページを再読み込みしてください。 |
| 年の形式 | `481–751`（範囲は en dash）、`465頃`（circa）、`前221`（紀元前） |

## 7. 検証

- Vitest（アプリ）: レイアウトの計算、年の表示形式、成果物の検証、中央の年を保つ計算
- 実ブラウザ: PC 幅と 375px 幅のそれぞれで、縦・横 × 王朝・王の 4 通りを確かめる。headless Chromium を使う
- E2E テストは作らない

## 8. 進め方

### 8.1 要ユーザー対話のチェックポイント

- 設計（この spec）と実装計画のレビュー
- Cloudflare: Secrets（`CLOUDFLARE_API_TOKEN`: Workers Scripts の Edit 権限、`CLOUDFLARE_ACCOUNT_ID`）の登録
- GitHub App（akihiro-tj-house-rules）の 2 リポへのインストールと、Secrets（`APM_UPDATE_CLIENT_ID`・`APM_UPDATE_PRIVATE_KEY`）の登録
- `apply-ruleset.sh` の実行（§5.6）
- デザインレビュー（DESIGN.md と HTML モック）
- データの承認（data リポの spec に従う）

### 8.2 CLAUDE.md

- アプリ: 目的、守ること（年表データも利用者の目に触れるコンテンツとして、案を示して承認を得る）、検証の方法（表示の切り替えのすべての組み合わせで確かめる）
- data リポ: data リポの spec に従う

### 8.3 運用

- specs と plans は承認までコミットを保留し、承認後にまとめてコミットする
- 各タスクに二段レビュー（spec 準拠とコード品質）を通す。レビュアーには、計画由来の欠陥も plan-mandated として報告すること、主張を鵜呑みにせず依存ライブラリのソースなど一次情報まで当たって検証することを伝える。修正後は同じレビュアーに再レビューさせる
- 台帳（`docs/superpowers/plans/*.progress.md`）に、完了タスクとコミット範囲、Minor 指摘を溜め、最終レビューでトリアージする
- モデルの使い分け: 計画にコードが書いてある転記タスクは軽量モデル、統合と UI は標準モデル、最終の全体レビューは最上位モデル
- テストは node 環境で動かし、DOM に依存するロジックは純粋関数に切り出す。DOM が要るテストを足す場合、ランタイムの版によっては jsdom にない Web API を自前のスタブで補う
