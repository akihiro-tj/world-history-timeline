# ダークモード対応 設計

ライト／ダークの 2 テーマを `<html data-color-theme>` で切り替える。初期値は OS 設定、以後はユーザーの明示選択を localStorage に保存して優先する。あわせて、既存のコントラスト不足（AA 未達の 2 箇所）を修正する。

## 背景と課題

- ダークモードに一切対応していない。`src/index.css` の `@theme` はライト値 1 系統のみで、`data-color-theme` 属性・`prefers-color-scheme` の参照・テーマの永続化はいずれも存在しない
- 白のハードコードが 2 種類ある。`EntryBar` のバー内ラベル（`fill-white`）と、`App` / `ErrorBoundary` のボタン文字（`bg-accent` + `text-white`）。前者はダーク背景でバー色を明るくすると読めなくなる
- 既存のコントラスト不足が 2 箇所ある。DESIGN.md は「コントラスト比 AA を守る」と定めているが、`--color-event` `#c2571f` + 白文字は 4.49:1、`--color-accent` `#4a90d9` + 白文字は 3.34:1 で、いずれも AA（4.5:1）に届かない

## 全体方針

UI の色はすべて `@theme` のトークン経由で参照されている。Tailwind v4 は `@theme` のトークンを `:root` の CSS 変数にコンパイルし、`bg-panel` / `text-ink` / `fill-muted` などのユーティリティを値のインライン化ではなく `var(--color-*)` 参照として出力する（実ビルドで確認済み）。したがって `[data-color-theme="dark"]` で変数を再定義すれば、既存のクラスは無改修でダーク値にカスケードする。

この性質により、変更はトークン定義・状態管理・トグル UI・白のハードコード 2 箇所に限定される。SVG 内の要素も `fill="var(--color-*)"` で色を参照しているため同じ経路で追従する。

地域色（`public/data/regions.json`）はデータの管轄として現状のまま扱い、ダークでも同じ色をレーン背景に不透明度 6% で重ねる。前景ではなく淡い背景であり、ダーク専用色を持たせる必要は薄い。

## カラートークン

ライトの 9 トークンは `--color-event` を除き現状維持とし、ダークの 9 値と新規 2 トークンを追加する。

| トークン | ライト | ダーク | 用途 |
| --- | --- | --- | --- |
| `--color-surface` | `#fafaf9` | `#16181c` | 画面背景 |
| `--color-panel` | `#ffffff` | `#1e2126` | パネル・トップバー・選択ハロー |
| `--color-ink` | `#1a1c1e` | `#e8e6e1` | 本文・見出し |
| `--color-muted` | `#6b7280` | `#9aa0aa` | 補助テキスト |
| `--color-line` | `#e5e4e0` | `#33373e` | 罫線・境界 |
| `--color-accent` | `#4a90d9` | `#5b9fe3` | 選択枠 |
| `--color-ruler` | `#3b6fb0` | `#6fa3d9` | 統治者バー |
| `--color-person` | `#7a5cb8` | `#a889d9` | 人物バー |
| `--color-event` | `#bd541d` | `#e08a4a` | 事件マーカー |
| `--color-on-bar` | `#ffffff` | `#16181c` | バー内ラベル（新規） |
| `--color-action` | `#2f6fb5` | `#2f6fb5` | ボタン背景（新規） |

ダークでは背景を沈め、前景のバー色は明度を上げて浮かせる。ライトの設計意図（彩度の低い背景に、主役であるバーだけが色を持つ）をダークでも保つ。

バー内ラベルはライトで白、ダークで背景色に切り替える。ダークのバー色は明度を上げているため、白文字ではコントラストが 2.65〜2.90:1 と AA に大きく届かない。暗色文字なら 6.13〜6.70:1 になる。同じ理由で、選択ハローに使う `--color-panel` はダークで暗色になり、明るいバー色と accent 枠の間の分離帯として機能する（バー色との比 6.09:1）。

`--color-event` はライトで `#c2571f` から `#bd541d` に変更し、白文字とのコントラストを 4.49:1 から 4.72:1 にする。色相をほぼ保ち、ruler・person より明るいままなので明度差による識別も維持される。

`--color-action` はボタン背景専用のトークンとして新設する。`--color-accent` は選択枠として視認性のために明るく保つ必要があり、ボタン背景としては白文字とのコントラストを満たせない。両者の要求が異なるためトークンを分ける。`#2f6fb5` + 白文字は 5.17:1 で、ライト・ダーク共通で AA を満たす。

新規トークンの導入にともない、白のハードコードを置き換える。`EntryBar` のバー内ラベル `fill-white` を `fill-on-bar` に、`App` と `ErrorBoundary` のボタン `bg-accent` を `bg-action` にする（ボタンの文字色は白のまま維持する）。

### 到達したコントラスト（本文サイズ基準 4.5:1）

| 組み合わせ | 比 |
| --- | --- |
| ダーク本文 `ink` on `surface` | 14.25 |
| ダーク補助 `muted` on `surface` / `panel` | 6.76 / 6.14 |
| ダークのバー内ラベル `on-bar` on ruler / person / event | 6.70 / 6.13 / 6.69 |
| ライトのバー内ラベル 白 on ruler / person / event | 5.14 / 5.18 / 4.72 |
| ボタン 白 on `action` | 5.17 |

## 状態管理

責務を 3 層に分ける。

- `src/domain/colorTheme.ts` — `ColorTheme`（`'light' | 'dark'`）型と純粋関数。`resolveInitialTheme(stored, prefersDark)` は保存値が `light` / `dark` のいずれかであればそれを返し、未保存または想定外の値であれば OS 設定にフォールバックする。`toggleColorTheme(theme)` は反転する
- `src/hooks/useColorTheme.ts` — `useState` の初期化子で `resolveInitialTheme` を呼び、`useLayoutEffect` で `document.documentElement.dataset.colorTheme` を同期する。localStorage の読み書きは `onboardingStorage.ts` と同じく `try` / `catch` で包み、ストレージが使えない環境でも動作を止めない。キーは既存の命名規則に合わせ `whtl:color-theme:v1`
- `src/components/TopBar.tsx` — トグルボタンを配置する。`aria-label` でテーマ切り替えであることを伝える

初回訪問時のみ OS 設定を採用し、以後は明示選択に従う。セッション中の OS 設定変更には追従しない（`change` イベントは購読しない）。

## 初期描画時のちらつき

`index.html` に同期スクリプトを置き、React のマウント前に `data-color-theme` を確定させる。これがないと、ダーク設定のユーザーには初期描画からマウントまでの間ライトの画面が見える。スクリプトは localStorage を読み、値が無ければ `prefers-color-scheme` を参照して属性を設定する。

ストレージキーが HTML と TypeScript の 2 箇所に現れるため、キーを変更するときは両方を直す必要がある。この結合は該当箇所にコメントで明示する。

## DESIGN.md の更新

frontmatter にダークのカラーセットを追加し、以下を追記する。

- テーマ切り替えの方式（`<html data-color-theme>`、初期値は OS 設定、localStorage に保存）
- ダークの配色方針（背景を沈め、前景のバー色は明度を上げて浮かせる）
- Do: バー上の文字は `on-bar` を使う（白を直接指定しない）
- Do: ボタン背景は `action`、選択枠は `accent` と用途で使い分ける
- Don't: 地域色にダーク専用値を持たせない（データの管轄を保つ）

## テスト方針

- `src/domain/colorTheme.test.ts` — `resolveInitialTheme` の分岐（保存値優先、未保存時は OS 設定、不正な保存値の扱い）と `toggleColorTheme` を単体テストする
- RTL — トグル操作で `document.documentElement` の `data-color-theme` が変わること、localStorage に保存されること、再マウント後に保存値が復元されることを検証する
- `src/test/setup.ts` の `matchMedia` スタブは `matches: false` 固定のため、OS 設定を制御できるよう拡張する
- 実画面での確認 — ダークでレーン背景（地域色 6%）が沈みすぎないか、バーとハローの分離が保たれるかをプレビュー URL で目視する

## 検討した代替案

- **3 状態（system / light / dark）** — OS 変更に追従できるが、UI と状態遷移が増える。学習ツールとして 2 状態で十分と判断した
- **`regions.json` にダーク用の色を追加** — 表現は上がるがデータ構造が複雑になり、8 地域分の再設計が必要になる。不透明度 6% の背景には過剰
- **ダークのバー色を暗くして白文字を維持** — 文字色が常に白で一貫するが、ruler が 4.20:1 で AA に届かず、ダーク背景でバーが沈む
- **ボタン文字を暗色にして `accent` を共有** — トークンは増えないが、青背景に黒文字という外観になる。専用トークンの追加を選んだ
- **初期描画時のちらつきを許容** — 実装は単純になるが、ダーク利用時に一瞬ライトが見える体験を避けるため同期スクリプトを採用した
