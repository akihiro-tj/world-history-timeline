# 世界史年表 MVP 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** フランク王国・フランスとイングランドの王朝と王を、縦／横と王朝／王を切り替えられる年表で表示する Web アプリを、Cloudflare Workers の静的アセットとして PR プレビュー付きでデプロイできる状態にする。

**Architecture:** React + Vite の SPA を Worker スクリプトなしの Cloudflare Workers 静的アセットとして配信する。年表データ（`src/data/timeline.json`）は `?url` でハッシュ付きのファイルとして出力し、起動時に fetch して厳密に検証する。年表の位置は向きに依存しない純粋関数（`layout.ts`）で時間軸方向（along）と直交方向（cross）の値として計算し、描画側（`Timeline.tsx`）がそれを縦か横に当てはめる。

**Tech Stack:** Node 24.21.0 / pnpm 12.6.0 / React 19.3 / Vite 8.3 / TypeScript 7.0 / Tailwind CSS 4.3 / Vitest 5.0 / Biome 2.5 / wrangler 4.141 / @google/design.md 0.4 / APM 0.32 / GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-27-world-history-timeline-design.md`（実装前に必ず読む。この計画は spec を根拠にしている）

## Global Constraints

- 言語: コミットメッセージは英語。UI 文言・ドキュメント・コード内コメント・テスト名・PR・イシューは日本語
- UI 文言は spec §6 の一覧だけを使う。一覧は `src/app/copy.ts` と `index.html` の `<title>` にしか書かない。新しい文言が必要になったら実装を止めてユーザーに確認する
- `index.html` の head は `charset`・`viewport`・`<title>世界史年表</title>` だけ。meta description・OGP・favicon・robots.txt・canonical は作らない
- 色・角丸・余白・文字は `DESIGN.md` の front matter だけで定義し、Tailwind のユーティリティ（`bg-surface`・`p-sm` など）で使う。値を直接書かない（`src/app/theme.css` は `pnpm tokens` の生成物）。例外として、年表の縮尺と寸法（1 年 = 2px、棒の太さ、見出しの寸法、文字 1 行の高さ 16px）は位置の計算に使うので `src/timeline/layout.ts` と `src/timeline/Timeline.tsx` の定数で持つ
- 依存は exact 指定。版は Task 1 のとおり
- npm script に `deploy` という名前を付けない（pnpm 組み込みコマンドに取られる）
- Worker 名は `world-history-timeline`。本番 URL は `https://world-history-timeline.akihiro-tj.workers.dev`
- テストは Vitest の `node` 環境だけ（jsdom は入れない）。E2E テストは作らない。UI は実ブラウザ（headless Chromium を含む）で PC 幅と 375px 幅を確かめる
- 作業ブランチは `claude/world-history-timeline-rbu0hc`。main に直接コミットしない
- 計画に書かれたテストの期待値が観測値と食い違ったら、期待値を観測値に合わせて書き換えず、BLOCKED として報告する

## Review Focus

- 終わりと次の始まりが同じ年の在位（ジョン王 1199–1216 → ヘンリ3世 1216–1272）が別の段に落ちる → 同じ段に並べる（Task 6 のテスト）
- 棒の外に出したラベルどうしが重なる（クヌートとウィリアム1世など）→ 重なるなら次の段にずらす（Task 6 のテスト）
- 末尾までスクロールした状態で向きを切り替える → スクロール量をスクロールできる範囲に収める（Task 7 のテスト）
- データの取得に失敗した、または知らないキー・壊れた参照を含む → 読み込まずに spec §6 のエラー文言を出す（Task 2 のテスト、Task 9 の実ブラウザ確認）
- ある主題の項目が 1 件も無い行や、データが空 → 落ちずに空の行を描く（Task 5・Task 6 のテスト）

## ファイル構成

```
flake.nix / flake.lock / .node-version
package.json / pnpm-lock.yaml / pnpm-workspace.yaml
biome.json / tsconfig.json / vite.config.ts / vitest.config.ts / .gitignore
apm.yml / apm.lock.yaml / .claude/（APM の生成物）
wrangler.jsonc / index.html / DESIGN.md / CLAUDE.md
public/_headers                       # /assets/* を immutable にする
scripts/
  smoke.sh                            # デプロイ先の確認（preview / deploy 共通）
  tokens.ts / lib/themeCss.ts (+test) # DESIGN.md → src/app/theme.css
src/
  main.tsx
  app/App.tsx, app/ToggleGroup.tsx, app/copy.ts, app/index.css, app/theme.css(生成物)
  data/timeline.ts (+test)            # 型と厳密な検証
  data/loadTimeline.ts (+test)        # 取得と検証
  data/timeline.json                  # data リポの成果物
  timeline/format.ts (+test)          # 年の表示形式
  timeline/spans.ts (+test)           # 主題ごとの棒の元データ
  timeline/layout.ts (+test)          # 向きに依存しない位置の計算
  timeline/scroll.ts (+test)          # 向きの初期値、中央の年を保つ計算
  timeline/useTextMeasure.ts          # 文字幅の測定
  timeline/Timeline.tsx               # 描画
.github/workflows/ci.yml / preview.yml / deploy.yml / apm-update.yml / .github/dependabot.yml
```

## タスク一覧（★ はユーザー対話が必要）

1. リポの土台
2. 年表データの型と読み込み
3. 配信・CI・プレビュー・本番デプロイ
4. ★ Cloudflare の準備とスパイク（PR 作成、プレビューで実機検証）
5. 年の表示形式と主題ごとの棒
6. レイアウトの計算
7. 向きの初期値と中央の年を保つ計算
8. ★ DESIGN.md とトークン生成（Artifact のモックでデザインレビュー）
9. 画面の組み立て
10. ★ データの取り込み（data リポの Task 4 の後）
11. CLAUDE.md
12. ★ ルールセットと最終確認

依存関係: 1 → 2 → 3 → 4。5・6・7 は 2 の後ならいつでもよい（6 は 5 の後）。8 は 1 の後（9 より前にレビューを終える）。9 は 5〜8 の後。10 は 9 と data リポの Task 4 の後。11・12 は最後。

---

### Task 1: リポの土台

**Files:**
- Create: `.node-version`, `flake.nix`, `flake.lock`, `package.json`, `pnpm-workspace.yaml`, `biome.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/index.css`, `apm.yml`, `.github/dependabot.yml`
- Modify: `.gitignore`（house-rules のテンプレートで置き換える）
- Generated: `pnpm-lock.yaml`, `apm.lock.yaml`, `.claude/`

**Interfaces:**
- Consumes: なし
- Produces: npm scripts `dev` / `build` / `preview` / `lint` / `format` / `typecheck` / `test`。`src/app/App.tsx` の `export function App()`。`src/app/index.css`（Task 8 が `@import "./theme.css";` を足す）

- [ ] **Step 1: このコンテナに Node 24 と APM を用意する**

このコンテナの Node は 22 なので、`.node-version` と同じ 24.21.0 を入れる。`~/.local/bin` は PATH の先頭にある。pnpm は `packageManager` の版に自動で切り替わる。

```bash
node --version | grep -q '^v24.21.0$' || {
  curl -fsSL https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz | tar -xJ -C "$HOME/.local"
  ln -sf "$HOME"/.local/node-v24.21.0-linux-x64/bin/{node,npm,npx} "$HOME/.local/bin/"
}
node --version
command -v apm || uv tool install apm-cli==0.32.0
```

Expected: `v24.21.0`。`apm --version` が 0.32.0。

- [ ] **Step 2: 設定ファイルを作る**

`.node-version`:

```
24.21.0
```

`flake.nix`:

```nix
{
  description = "世界史年表の開発環境";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          # pnpm は package.json の packageManager に書いた版へ自動で切り替わる
          packages = [
            pkgs.nodejs_24
            pkgs.pnpm
          ];
        };
      });
    };
}
```

`flake.lock` は world-history-map の `flake.lock` をコピーする（入力が同じ nixpkgs だけなので、同じロックがそのまま使える。このコンテナに nix は無い）:

```bash
cp ../world-history-map/flake.lock flake.lock
```

`package.json`（依存は Step 3 で入れる）:

```json
{
  "name": "world-history-timeline",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.6.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
# pnpm の設定。ビルドスクリプトの許可などをここで管理する
allowBuilds:
  esbuild: true
  workerd: true
# 公開直後の版の取得制御は dependabot の cooldown で行うため、
# pnpm の minimumReleaseAge（既定 1440 分）は無効化する
minimumReleaseAge: 0
# 依存は exact 指定で追加する（pnpm 12 は .npmrc の save-exact を読まない）
saveExact: true
```

`.gitignore` と `.github/dependabot.yml` は house-rules のテンプレートをコピーする（`../house-rules` は main を最新にしておく）:

```bash
git -C ../house-rules fetch -q origin main && git -C ../house-rules checkout -q origin/main
cp ../house-rules/templates/gitignore .gitignore
printf '\n# 世界史年表\n.wrangler/\n.dev.vars\nCLAUDE.local.md\n' >> .gitignore
mkdir -p .github/workflows
cp ../house-rules/templates/dependabot.yml .github/dependabot.yml
grep -qx 'dist' .gitignore && grep -q 'apm_modules' .gitignore
```

Expected: 最後の grep が成功する。

- [ ] **Step 3: 依存を exact 指定で入れる**

```bash
pnpm add react@19.3.0 react-dom@19.3.0
pnpm add -D vite@8.3.1 @vitejs/plugin-react@6.1.1 typescript@7.0.2 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vitest@5.0.2 @biomejs/biome@2.5.14 wrangler@4.141.0 @google/design.md@0.4.0 tsx@4.23.15 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@24.19.0
pnpm --version
```

Expected: `pnpm --version` が `12.6.0`。「Ignored build scripts」と出たら、`esbuild` と `workerd` 以外は許可しない。

- [ ] **Step 4: TypeScript・Vite・Vitest・Biome の設定を書く**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts", "vitest.config.ts"]
}
```

`vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // 年表データは小さくてもインライン化せず、ハッシュ付きのファイルとして出す（spec §4.2）
    assetsInlineLimit: (file) => (file.endsWith("/src/data/timeline.json") ? false : undefined),
  },
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
```

`biome.json`（`.claude/` の superpowers 同梱スクリプトと、生成物の `theme.css` は対象外にする）:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!.claude", "!src/app/theme.css", "!apm.lock.yaml"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "preset": "recommended" } },
  "css": { "parser": { "tailwindDirectives": true } }
}
```

- [ ] **Step 5: 最小の画面を作る**

`index.html`（文言は spec §6 のとおり。head に他の要素を足さない）:

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>世界史年表</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/app/index.css`:

```css
@import "tailwindcss";
```

`src/app/App.tsx`:

```tsx
export function App() {
  return <div className="h-dvh w-full" />;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("#root が見つかりません");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: house-rules のルールを APM で入れる**

`apm.yml`（`executables` は house-rules の README のとおり、必ず書く）:

```yaml
name: world-history-timeline
version: 1.0.0
targets:
  - claude
dependencies:
  apm:
    - akihiro-tj/house-rules/packages/core#main
    - akihiro-tj/house-rules/packages/web-react#main
    - akihiro-tj/house-rules/packages/cloudflare-workers#main
    - akihiro-tj/house-rules/packages/github-actions#main
executables:
  allow:
    github.com/akihiro-tj/house-rules/packages/core:
      hooks: true
  deny:
    obra/superpowers:
      hooks: true
```

```bash
apm install
ls .claude/rules .claude/skills
```

Expected: `.claude/rules/` に core・web-react・cloudflare-workers・github-actions の rule（`git.md`・`react.md`・`testing.md`・`pnpm.md`・`cloudflare-workers.md`・`github-actions.md` など）が、`.claude/skills/` に superpowers のスキルができ、`apm.lock.yaml` ができる。

- [ ] **Step 7: 検査がすべて通ることを確認する**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: すべて成功。`dist/index.html` ができる。

- [ ] **Step 8: コミットする**

```bash
git add -A
git commit -m "Scaffold React + Vite + Tailwind app with Biome, Vitest, nix devShell and APM rules"
```

---

### Task 2: 年表データの型と読み込み

**Files:**
- Create: `src/data/timeline.ts`, `src/data/loadTimeline.ts`, `src/data/timeline.json`, `src/app/copy.ts`
- Modify: `src/app/App.tsx`
- Test: `src/data/timeline.test.ts`, `src/data/loadTimeline.test.ts`

**Interfaces:**
- Consumes: Task 1 の `vite.config.ts`（`assetsInlineLimit`）
- Produces:
  - 型 `Year` `Lane` `Dynasty` `Person` `Reign` `TimelineData`
  - `parseTimeline(value: unknown): TimelineData`（形が違えば例外）
  - `loadTimeline(fetchFn: typeof fetch, url: string): Promise<TimelineData>`
  - `COPY`（spec §6 の文言すべて。キー: `subjectLabel` `subjectDynasty` `subjectReign` `orientationLabel` `orientationVertical` `orientationHorizontal` `timelineLabel` `loading` `loadError`）

- [ ] **Step 1: 失敗するテストを書く**

`src/data/timeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseTimeline } from "./timeline";

function valid() {
  return {
    lanes: [{ id: "england", name: "イングランド", dynasties: ["tudor"], reigns: ["henry-vii"] }],
    dynasties: [
      {
        id: "tudor",
        name: "テューダー朝",
        start: { year: 1485, circa: false },
        end: { year: 1603, circa: false },
      },
    ],
    people: [{ id: "henry-vii", name: "ヘンリ7世" }],
    reigns: [
      {
        id: "henry-vii",
        personId: "henry-vii",
        start: { year: 1485, circa: false },
        end: { year: 1509, circa: false },
      },
    ],
  };
}

describe("parseTimeline", () => {
  it("正しいデータをそのまま返す", () => {
    expect(parseTimeline(valid())).toEqual(valid());
  });

  it("空の配列だけのデータも読み込める", () => {
    const empty = { lanes: [], dynasties: [], people: [], reigns: [] };
    expect(parseTimeline(empty)).toEqual(empty);
  });

  it("知らないキーがあれば例外にする", () => {
    const data = valid();
    Object.assign(data.people[0] ?? {}, { note: "テスト" });
    expect(() => parseTimeline(data)).toThrow("知らないキー note");
  });

  it("欠けたキーがあれば例外にする", () => {
    const data: Record<string, unknown> = valid();
    delete data.reigns;
    expect(() => parseTimeline(data)).toThrow("キー reigns がありません");
  });

  it("年が整数でなければ例外にする", () => {
    const data = valid();
    (data.dynasties[0] as { start: unknown }).start = { year: "1485", circa: false };
    expect(() => parseTimeline(data)).toThrow("year は整数です");
  });

  it("circa が真偽値でなければ例外にする", () => {
    const data = valid();
    (data.dynasties[0] as { start: unknown }).start = { year: 1485, circa: "false" };
    expect(() => parseTimeline(data)).toThrow("circa は真偽値です");
  });

  it("開始が終了より後なら例外にする", () => {
    const data = valid();
    (data.reigns[0] as { end: unknown }).end = { year: 1484, circa: false };
    expect(() => parseTimeline(data)).toThrow("開始が終了より後です");
  });

  it("存在しない人物を参照していれば例外にする", () => {
    const data = valid();
    (data.reigns[0] as { personId: string }).personId = "henry-viii";
    expect(() => parseTimeline(data)).toThrow("存在しない人物を参照しています: henry-viii");
  });

  it("行が存在しない王朝を参照していれば例外にする", () => {
    const data = valid();
    (data.lanes[0] as { dynasties: string[] }).dynasties = ["stuart"];
    expect(() => parseTimeline(data)).toThrow("存在しない id を参照しています: stuart");
  });

  it("id が重複していれば例外にする", () => {
    const data = valid();
    data.people.push({ id: "henry-vii", name: "ヘンリ7世" });
    expect(() => parseTimeline(data)).toThrow("id が重複しています: henry-vii");
  });

  it("名前が空なら例外にする", () => {
    const data = valid();
    (data.people[0] as { name: string }).name = " ";
    expect(() => parseTimeline(data)).toThrow("名前が空です");
  });

  it("配列でなければ例外にする", () => {
    expect(() => parseTimeline([])).toThrow("オブジェクトではありません");
  });
});
```

`src/data/loadTimeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadTimeline } from "./loadTimeline";

const empty = { lanes: [], dynasties: [], people: [], reigns: [] };

function fakeFetch(status: number, body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("loadTimeline", () => {
  it("取得したデータを検証して返す", async () => {
    await expect(loadTimeline(fakeFetch(200, empty), "/timeline.json")).resolves.toEqual(empty);
  });

  it("取得に失敗したら例外にする", async () => {
    await expect(loadTimeline(fakeFetch(404, {}), "/timeline.json")).rejects.toThrow("（404）");
  });

  it("検証に失敗したら例外にする", async () => {
    await expect(loadTimeline(fakeFetch(200, []), "/timeline.json")).rejects.toThrow(
      "オブジェクトではありません",
    );
  });

  it("JSON でなければ例外にする", async () => {
    const fetchFn: typeof fetch = async () => new Response("<html>", { status: 200 });
    await expect(loadTimeline(fetchFn, "/timeline.json")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/data`
Expected: FAIL（`./timeline` と `./loadTimeline` が見つからない）

- [ ] **Step 3: 実装する**

`src/data/timeline.ts`:

```ts
// 年表データ（data リポの成果物）の型と、JSON を読み込むときの厳密な検証

export type Year = { year: number; circa: boolean };
export type Lane = { id: string; name: string; dynasties: string[]; reigns: string[] };
export type Dynasty = { id: string; name: string; start: Year; end: Year };
export type Person = { id: string; name: string };
export type Reign = { id: string; personId: string; start: Year; end: Year };
export type TimelineData = {
  lanes: Lane[];
  dynasties: Dynasty[];
  people: Person[];
  reigns: Reign[];
};

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

function fail(where: string, reason: string): never {
  throw new Error(`年表データの ${where}: ${reason}`);
}

// キーが過不足なくそろったオブジェクトであることを確かめる
function record(value: unknown, keys: readonly string[], where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(where, "オブジェクトではありません");
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail(where, `知らないキー ${key} があります`);
  }
  for (const key of keys) {
    if (!(key in value)) fail(where, `キー ${key} がありません`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) return fail(where, "配列ではありません");
  return value;
}

function id(value: unknown, where: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) return fail(where, "id が不正です");
  return value;
}

function name(value: unknown, where: string): string {
  if (typeof value !== "string" || value.trim() === "") return fail(where, "名前が空です");
  return value;
}

function year(value: unknown, where: string): Year {
  const r = record(value, ["year", "circa"], where);
  if (typeof r.year !== "number" || !Number.isInteger(r.year)) {
    return fail(where, "year は整数です");
  }
  if (typeof r.circa !== "boolean") return fail(where, "circa は真偽値です");
  return { year: r.year, circa: r.circa };
}

function period(r: Record<string, unknown>, where: string): { start: Year; end: Year } {
  const start = year(r.start, `${where}.start`);
  const end = year(r.end, `${where}.end`);
  if (start.year > end.year) fail(where, "開始が終了より後です");
  return { start, end };
}

function unique<T extends { id: string }>(items: T[], where: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) fail(where, `id が重複しています: ${item.id}`);
    map.set(item.id, item);
  }
  return map;
}

function references(value: unknown, known: Map<string, unknown>, where: string): string[] {
  return array(value, where).map((item, i) => {
    const ref = id(item, `${where}[${i}]`);
    if (!known.has(ref)) fail(`${where}[${i}]`, `存在しない id を参照しています: ${ref}`);
    return ref;
  });
}

export function parseTimeline(value: unknown): TimelineData {
  const root = record(value, ["lanes", "dynasties", "people", "reigns"], "全体");

  const dynasties = array(root.dynasties, "dynasties").map((item, i) => {
    const where = `dynasties[${i}]`;
    const r = record(item, ["id", "name", "start", "end"], where);
    return { id: id(r.id, where), name: name(r.name, where), ...period(r, where) };
  });
  const dynastyMap = unique(dynasties, "dynasties");

  const people = array(root.people, "people").map((item, i) => {
    const where = `people[${i}]`;
    const r = record(item, ["id", "name"], where);
    return { id: id(r.id, where), name: name(r.name, where) };
  });
  const personMap = unique(people, "people");

  const reigns = array(root.reigns, "reigns").map((item, i) => {
    const where = `reigns[${i}]`;
    const r = record(item, ["id", "personId", "start", "end"], where);
    const personId = id(r.personId, where);
    if (!personMap.has(personId)) fail(where, `存在しない人物を参照しています: ${personId}`);
    return { id: id(r.id, where), personId, ...period(r, where) };
  });
  const reignMap = unique(reigns, "reigns");

  const lanes = array(root.lanes, "lanes").map((item, i) => {
    const where = `lanes[${i}]`;
    const r = record(item, ["id", "name", "dynasties", "reigns"], where);
    return {
      id: id(r.id, where),
      name: name(r.name, where),
      dynasties: references(r.dynasties, dynastyMap, `${where}.dynasties`),
      reigns: references(r.reigns, reignMap, `${where}.reigns`),
    };
  });
  unique(lanes, "lanes");

  return { lanes, dynasties, people, reigns };
}
```

`src/data/loadTimeline.ts`:

```ts
// 年表データを取得して検証する
import { parseTimeline, type TimelineData } from "./timeline";

export async function loadTimeline(fetchFn: typeof fetch, url: string): Promise<TimelineData> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`年表データの取得に失敗しました（${response.status}）`);
  }
  return parseTimeline(await response.json());
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test src/data`
Expected: PASS（16 件）

- [ ] **Step 5: 空のデータと文言を置き、起動時に読み込む**

`src/data/timeline.json`（Task 10 で data リポの成果物に置き換える）:

```json
{ "lanes": [], "dynasties": [], "people": [], "reigns": [] }
```

`src/app/copy.ts`（spec §6 の文言。Task 9 で使うものも含めてここで全部書く）:

```ts
// UI 文言（spec §6）。ここと index.html の <title> 以外に文言を書かない
export const COPY = {
  subjectLabel: "主題",
  subjectDynasty: "王朝",
  subjectReign: "王",
  orientationLabel: "向き",
  orientationVertical: "縦",
  orientationHorizontal: "横",
  timelineLabel: "年表",
  loading: "読み込み中…",
  loadError: "年表のデータを読み込めませんでした。ページを再読み込みしてください。",
} as const;
```

`src/app/App.tsx`（仮の画面。Task 9 で置き換える）:

```tsx
import { useEffect, useState } from "react";
import { loadTimeline } from "../data/loadTimeline";
import timelineUrl from "../data/timeline.json?url";
import { COPY } from "./copy";

type Status = "loading" | "error" | "ready";

export function App() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    loadTimeline(window.fetch.bind(window), timelineUrl).then(
      () => {
        if (active) setStatus("ready");
      },
      (error: unknown) => {
        console.error(error);
        if (active) setStatus("error");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="h-dvh w-full">
      {status === "loading" && <p>{COPY.loading}</p>}
      {status === "error" && <p role="alert">{COPY.loadError}</p>}
    </div>
  );
}
```

- [ ] **Step 6: ビルドで年表データがハッシュ付きのファイルになることを確認する**

```bash
pnpm typecheck && pnpm lint && pnpm build && ls dist/assets | grep -E '^timeline-.*\.json$' && grep -l 'assets/timeline-' dist/assets/*.js
```

Expected: `dist/assets/timeline-<ハッシュ>.json` があり、JS がその URL を含む（インライン化されていない）。

- [ ] **Step 7: コミットする**

```bash
git add src
git commit -m "Load and strictly validate timeline data fetched as a hashed asset"
```

---

### Task 3: 配信・CI・プレビュー・本番デプロイ

**Files:**
- Create: `wrangler.jsonc`, `public/_headers`, `scripts/smoke.sh`, `.github/workflows/ci.yml`, `.github/workflows/preview.yml`, `.github/workflows/deploy.yml`, `.github/workflows/apm-update.yml`

**Interfaces:**
- Consumes: Task 2 のビルド結果（`dist/assets/index-*.js` が `assets/timeline-*.json` を参照する）
- Produces: `bash scripts/smoke.sh <base-url>`。CI のジョブ名 `Check and build`（Task 12 のルールセットが必須チェックにする）。Task 8 で `ci.yml` に DESIGN.md の検査を足す

- [ ] **Step 1: wrangler と `_headers` を書く**

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "world-history-timeline",
  "compatibility_date": "2026-09-27",
  // workers.dev の本番 URL とプレビュー URL をどちらも明示的に有効にする
  "workers_dev": true,
  "preview_urls": true,
  // Worker スクリプトは置かず、静的アセットだけで配信する（spec §5.3）
  "assets": { "directory": "./dist" },
  "observability": { "enabled": true }
}
```

`public/_headers`:

```text
# Vite が出力するハッシュ付きのファイル（JS・CSS・年表データ）は内容が変われば URL も変わるので、長期キャッシュする
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 2: スモークテストを書く**

`scripts/smoke.sh`:

```bash
#!/usr/bin/env bash
# デプロイ先（本番・プレビュー）の基本動作を確かめる
# 使い方: bash scripts/smoke.sh https://example.workers.dev
# デプロイ直後は新しいバージョンが行き渡っていないことがあるので、失敗したら間を置いてやり直す
set -euo pipefail

base="${1%/}"
attempts="${SMOKE_ATTEMPTS:-10}"
interval="${SMOKE_INTERVAL:-6}"

fail() {
  echo "$1" >&2
  return 1
}

cache_control() {
  curl -fsS -D - -o /dev/null "$1" | tr -d '\r' | awk -F': ' 'tolower($1) == "cache-control" { print $2 }'
}

check() {
  local html script js data cache
  html="$(curl -fsS "$base/")" || fail "トップページが取得できません" || return 1

  script="$(grep -o '/assets/index-[A-Za-z0-9_-]*\.js' <<<"$html" | head -n1)"
  [[ -n "$script" ]] || fail "トップページに JS の参照がありません" || return 1
  js="$(curl -fsS "$base$script")" || fail "JS が取得できません: $script" || return 1

  # 年表データの URL は JS に埋め込まれている（import ... from "./timeline.json?url"）
  data="$(grep -o 'assets/timeline-[A-Za-z0-9_-]*\.json' <<<"$js" | head -n1)"
  [[ -n "$data" ]] || fail "JS に年表データの参照がありません" || return 1
  curl -fsS "$base/$data" | jq -e '(.lanes | type) == "array"' >/dev/null ||
    fail "年表データが取得できません: $data" || return 1

  cache="$(cache_control "$base/$data")"
  [[ "$cache" == *immutable* ]] || fail "年表データに immutable が付いていません: $cache" || return 1
  cache="$(cache_control "$base$script")"
  [[ "$cache" == *immutable* ]] || fail "JS に immutable が付いていません: $cache" || return 1
}

for ((i = 1; i <= attempts; i++)); do
  if check; then
    echo "スモークテスト成功: $base"
    exit 0
  fi
  if ((i < attempts)); then
    echo "${i} 回目の確認に失敗しました。${interval} 秒後にやり直します" >&2
    sleep "$interval"
  fi
done

echo "スモークテスト失敗: $base（${attempts} 回試しました）" >&2
exit 1
```

- [ ] **Step 3: ワークフローを書く**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  check:
    name: Check and build
    runs-on: ubuntu-24.04
    steps:
      - uses: akihiro-tj/house-rules/.github/actions/setup-node-pnpm@main
      - run: pnpm exec biome ci .
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - name: Report initial JS size
        run: |
          # 目標は gzip 後 100KB 以下（spec §5.4）。失敗にはせず、サイズを出すだけ
          for f in dist/assets/index-*.js; do
            echo "$f: $(gzip -c "$f" | wc -c) bytes (gzip)" | tee -a "$GITHUB_STEP_SUMMARY"
          done
      - run: pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run
```

`.github/workflows/preview.yml`（dependabot と fork からの PR には Secrets が渡らないので実行しない）:

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
env:
  PREVIEW_NAME: pr-${{ github.event.pull_request.number }}
jobs:
  deploy:
    name: Deploy preview
    if: >-
      github.event.action != 'closed' &&
      github.actor != 'dependabot[bot]' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-24.04
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: akihiro-tj/house-rules/.github/actions/setup-node-pnpm@main
      - run: pnpm build
      - id: preview
        uses: akihiro-tj/house-rules/.github/actions/wrangler-preview@main
        with:
          name: ${{ env.PREVIEW_NAME }}
      - name: Smoke test
        run: bash scripts/smoke.sh "${{ steps.preview.outputs.url }}"
  cleanup:
    name: Delete preview
    if: >-
      github.event.action == 'closed' &&
      github.actor != 'dependabot[bot]' &&
      github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-24.04
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: akihiro-tj/house-rules/.github/actions/setup-node-pnpm@main
      - uses: akihiro-tj/house-rules/.github/actions/wrangler-preview-delete@main
        with:
          name: ${{ env.PREVIEW_NAME }}
```

`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: production
  cancel-in-progress: false
env:
  PRODUCTION_URL: https://world-history-timeline.akihiro-tj.workers.dev
jobs:
  deploy:
    name: Deploy to production
    runs-on: ubuntu-24.04
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: akihiro-tj/house-rules/.github/actions/setup-node-pnpm@main
      - run: pnpm build
      - run: pnpm exec wrangler deploy
      - name: Smoke test
        run: bash scripts/smoke.sh "$PRODUCTION_URL"
```

`.github/workflows/apm-update.yml`:

```yaml
name: APM update
on:
  schedule:
    - cron: "0 0 * * *" # 毎日 9:00（日本時間）
  workflow_dispatch:
jobs:
  update:
    uses: akihiro-tj/house-rules/.github/workflows/apm-update.yml@main
    secrets: inherit
```

- [ ] **Step 4: ローカルで確認できる範囲を確認する**

`wrangler dev` は `_headers` を反映して `dist/` を配信するので、スモークテストをローカルで流せる（Cloudflare への接続は要らない。テレメトリの接続失敗は無視してよい）。

```bash
bash -n scripts/smoke.sh
for f in .github/workflows/*.yml .github/dependabot.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))" && echo "OK $f"; done
pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build
pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run
(pnpm exec wrangler dev --port 8788 --ip 127.0.0.1 > .wrangler/dev.log 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:8788/ && break; sleep 1; done
SMOKE_ATTEMPTS=1 bash scripts/smoke.sh http://127.0.0.1:8788
pkill -f "wrangler dev" || true
```

Expected: すべて成功し、最後に「スモークテスト成功: http://127.0.0.1:8788」。

- [ ] **Step 5: コミットする**

```bash
git add wrangler.jsonc public scripts/smoke.sh .github
git commit -m "Serve the app as Workers static assets with CI, PR previews, production deploy and smoke test"
```

---

### Task 4: ★ Cloudflare の準備とスパイク

**このタスクはコントローラー（メインのセッション）が行う。サブエージェントに渡さない。**

**Files:**
- Modify: `docs/superpowers/specs/2026-09-27-world-history-timeline-design.md`（§5.3 に結果を書く）
- Create（スパイクで前提が崩れたときだけ）: `src/worker/index.ts`, `tsconfig.worker.json`

**Interfaces:**
- Consumes: Task 1〜3 の成果物
- Produces: 動作が確認できたプレビュー環境とドラフト PR

- [ ] **Step 1: ★ ユーザーに準備を依頼する**

次のメッセージをユーザーに送り、完了の返事を待つ。

> Cloudflare と GitHub の準備をお願いします。
> 1. world-history-timeline のリポジトリ Secrets に `CLOUDFLARE_API_TOKEN`（アカウントの「Workers Scripts: Edit」権限。world-history-map と同じトークンでも構いません）と `CLOUDFLARE_ACCOUNT_ID` を登録してください
> 2. GitHub App（akihiro-tj-house-rules）を world-history-timeline にインストールし、Secrets（`APM_UPDATE_CLIENT_ID`・`APM_UPDATE_PRIVATE_KEY`）を登録してください（apm-update ワークフローが使います）

- [ ] **Step 2: push してドラフト PR を作る**

```bash
git push -u origin claude/world-history-timeline-rbu0hc
```

`.github/pull_request_template.md` があれば構成を合わせる。無ければ GitHub MCP の `create_pull_request`（draft: true、base: main）で作る。

- タイトル: `世界史年表 MVP`
- 本文: 概要（spec と計画へのリンク）、現状（Task 1〜3 まで）、確認したこと、未完了のタスク

PR を作ったら、PR の CI・レビューを監視するかどうかをユーザーに尋ねる。

- [ ] **Step 3: スパイクの確認項目を順に確かめる**

作業環境からは workers.dev に接続できないので、ワークフローのログで確かめる（GitHub MCP の `actions_list` / `get_job_logs`）。

1. `Preview` ワークフローの `Create Worker preview` が成功し、Worker スクリプトの無い構成で URL が出力され、PR にプレビュー URL のコメントが付いているか
2. `Smoke test` が成功しているか（JS と年表データに `immutable` が付く = `_headers` がプレビューで効いている）
3. `CI` の `Check and build` が成功し、初期 JS のサイズが出ているか

失敗した場合の切り分け:

- 権限エラー（401 / code 9109 など）→ トークンの権限を確かめ、ユーザーに登録し直しを依頼する
- アセットだけの構成で `wrangler preview` が失敗する、または `_headers` が効かない → spec §5.3 のフォールバックに切り替える。切り替える前にユーザーに状況を伝える。切り替えは次のとおり:

`src/worker/index.ts`:

```ts
// 静的アセットをそのまま返し、ハッシュ付きのファイルに長期キャッシュのヘッダーを付ける（spec §5.3 のフォールバック）
type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    if (!new URL(request.url).pathname.startsWith("/assets/") || !response.ok) {
      return response;
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new Response(response.body, { status: response.status, headers });
  },
};
```

`wrangler.jsonc` に `"main": "src/worker/index.ts"` を足し、`assets` を `{ "directory": "./dist", "binding": "ASSETS", "run_worker_first": ["/assets/*"] }` にする。`tsconfig.json` の `include` から `src/worker` を外し（`"exclude": ["src/worker"]`）、`tsconfig.worker.json` を足して `typecheck` を `tsc -p tsconfig.json && tsc -p tsconfig.worker.json` にする。`@cloudflare/workers-types` は入れず、上の `Env` 型で足りる（`tsconfig.worker.json` の `lib` は `["ES2023", "WebWorker"]`）。

- [ ] **Step 4: 結果を spec に書く**

spec §5.3 の後に「スパイクの結果（YYYY-MM-DD、PR #番号）」を追記する（各項目: 確認したこと・結果・対応）。

```bash
git add docs/superpowers/specs/2026-09-27-world-history-timeline-design.md
git commit -m "Record spike results for assets-only Workers previews and cache headers"
git push
```

---

### Task 5: 年の表示形式と主題ごとの棒

**Files:**
- Create: `src/timeline/format.ts`, `src/timeline/spans.ts`
- Test: `src/timeline/format.test.ts`, `src/timeline/spans.test.ts`

**Interfaces:**
- Consumes: Task 2 の `Year` `Lane` `TimelineData`
- Produces:
  - `formatYear(year: Year): string`（`481` / `465頃` / `前221`）、`formatPeriod(start: Year, end: Year): string`（`481–751`）
  - 型 `Subject = "dynasty" | "reign"`、型 `Span = { id: string; name: string; start: Year; end: Year }`
  - `spansForLane(data: TimelineData, lane: Lane, subject: Subject): Span[]`

- [ ] **Step 1: 失敗するテストを書く**

`src/timeline/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatPeriod, formatYear } from "./format";

describe("formatYear", () => {
  it("紀元後の年は数字だけ", () => {
    expect(formatYear({ year: 481, circa: false })).toBe("481");
  });

  it("circa なら「頃」を付ける", () => {
    expect(formatYear({ year: 465, circa: true })).toBe("465頃");
  });

  it("紀元前は「前」を付ける", () => {
    expect(formatYear({ year: -221, circa: false })).toBe("前221");
    expect(formatYear({ year: -221, circa: true })).toBe("前221頃");
  });
});

describe("formatPeriod", () => {
  it("開始と終了を en dash でつなぐ", () => {
    expect(formatPeriod({ year: 481, circa: false }, { year: 751, circa: false })).toBe("481–751");
  });
});
```

`src/timeline/spans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import { spansForLane } from "./spans";

const y = (year: number) => ({ year, circa: false });

const data: TimelineData = {
  lanes: [
    { id: "england", name: "イングランド", dynasties: ["york", "tudor"], reigns: ["henry-vii"] },
    { id: "empty", name: "空の行", dynasties: [], reigns: [] },
  ],
  dynasties: [
    { id: "tudor", name: "テューダー朝", start: y(1485), end: y(1603) },
    { id: "york", name: "ヨーク家", start: y(1461), end: y(1485) },
  ],
  people: [{ id: "henry", name: "ヘンリ7世" }],
  reigns: [{ id: "henry-vii", personId: "henry", start: y(1485), end: y(1509) }],
};

describe("spansForLane", () => {
  it("王朝は行に並べた順で返す", () => {
    const lane = data.lanes[0];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "dynasty").map((span) => span.name)).toEqual([
      "ヨーク家",
      "テューダー朝",
    ]);
  });

  it("在位は人物の名前と在位の期間を返す", () => {
    const lane = data.lanes[0];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "reign")).toEqual([
      { id: "henry-vii", name: "ヘンリ7世", start: y(1485), end: y(1509) },
    ]);
  });

  it("その主題の項目が無い行は空の配列を返す", () => {
    const lane = data.lanes[1];
    if (!lane) throw new Error("テストデータがありません");
    expect(spansForLane(data, lane, "reign")).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/timeline`
Expected: FAIL（`./format` と `./spans` が見つからない）

- [ ] **Step 3: 実装する**

`src/timeline/format.ts`:

```ts
// 年の表示形式（spec §6）
import type { Year } from "../data/timeline";

export function formatYear({ year, circa }: Year): string {
  const text = year < 0 ? `前${-year}` : String(year);
  return circa ? `${text}頃` : text;
}

export function formatPeriod(start: Year, end: Year): string {
  return `${formatYear(start)}–${formatYear(end)}`;
}
```

`src/timeline/spans.ts`:

```ts
// 主題（王朝／王）に応じて、行に並べる棒の元データを取り出す
import type { Lane, TimelineData, Year } from "../data/timeline";

export type Subject = "dynasty" | "reign";
export type Span = { id: string; name: string; start: Year; end: Year };

function lookup<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`年表データに id ${id} がありません`);
  return item;
}

export function spansForLane(data: TimelineData, lane: Lane, subject: Subject): Span[] {
  if (subject === "dynasty") {
    return lane.dynasties.map((id) => {
      const { name, start, end } = lookup(data.dynasties, id);
      return { id, name, start, end };
    });
  }
  return lane.reigns.map((id) => {
    const reign = lookup(data.reigns, id);
    return {
      id,
      name: lookup(data.people, reign.personId).name,
      start: reign.start,
      end: reign.end,
    };
  });
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test src/timeline && pnpm typecheck && pnpm lint`
Expected: PASS（7 件）

- [ ] **Step 5: コミットする**

```bash
git add src/timeline
git commit -m "Format years and pick timeline spans for the selected subject"
```

---

### Task 6: レイアウトの計算

**Files:**
- Create: `src/timeline/layout.ts`
- Test: `src/timeline/layout.test.ts`

**Interfaces:**
- Consumes: Task 2 の `TimelineData`、Task 5 の `Span` `formatPeriod`
- Produces:
  - 型 `Orientation = "vertical" | "horizontal"`、`TimeRange = { from: number; to: number }`、`LabelSize`、`BarLayout`、`LaneLayout`
  - 定数 `PX_PER_YEAR`（2） `TICK_STEP`（100） `LINE_HEIGHT`（16） `BAR_THICKNESS`（36） `TRACK_GAP`（4） `LABEL_GAP`（6）
  - `timeRange(data: TimelineData): TimeRange | null`、`ticks(range: TimeRange): number[]`、`yearToOffset(year: number, range: TimeRange): number`、`rangeLength(range: TimeRange): number`
  - `assignTracks(periods: { start: number; end: number }[]): number[]`
  - `layoutLane(spans: Span[], range: TimeRange, orientation: Orientation, measure: (text: string) => number): LaneLayout`
  - `labelRowStart(labelRowSizes: number[], row: number): number`、`labelRowsTotal(labelRowSizes: number[]): number`

- [ ] **Step 1: 失敗するテストを書く**

`src/timeline/layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { TimelineData } from "../data/timeline";
import {
  assignTracks,
  labelRowStart,
  labelRowsTotal,
  layoutLane,
  ticks,
  timeRange,
  yearToOffset,
} from "./layout";
import type { Span } from "./spans";

const y = (year: number) => ({ year, circa: false });
const span = (id: string, name: string, start: number, end: number): Span => ({
  id,
  name,
  start: y(start),
  end: y(end),
});
// 1 文字 10px として幅を測る
const measure = (text: string) => text.length * 10;

describe("timeRange", () => {
  it("王朝と在位のすべての年を含み、100 年の区切りにそろえる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", start: y(481), end: y(751) }],
      people: [{ id: "p", name: "P" }],
      reigns: [{ id: "r", personId: "p", start: y(1485), end: y(1603) }],
    };
    expect(timeRange(data)).toEqual({ from: 400, to: 1700 });
  });

  it("紀元前も区切りにそろえる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", start: y(-221), end: y(-206) }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data)).toEqual({ from: -300, to: -200 });
  });

  it("区切りちょうどの 1 点だけでも幅を持たせる", () => {
    const data: TimelineData = {
      lanes: [],
      dynasties: [{ id: "a", name: "A", start: y(1500), end: y(1500) }],
      people: [],
      reigns: [],
    };
    expect(timeRange(data)).toEqual({ from: 1500, to: 1600 });
  });

  it("データが無ければ null", () => {
    expect(timeRange({ lanes: [], dynasties: [], people: [], reigns: [] })).toBeNull();
  });
});

describe("ticks と yearToOffset", () => {
  it("100 年ごとの目盛りを返す", () => {
    expect(ticks({ from: 400, to: 700 })).toEqual([400, 500, 600, 700]);
  });

  it("1 年を 2px に換算する", () => {
    expect(yearToOffset(481, { from: 400, to: 700 })).toBe(162);
  });
});

describe("assignTracks", () => {
  it("終わりと次の始まりが同じ年なら同じ段に置く", () => {
    // ジョン王 1199–1216 とヘンリ3世 1216–1272
    expect(
      assignTracks([
        { start: 1199, end: 1216 },
        { start: 1216, end: 1272 },
      ]),
    ).toEqual([0, 0]);
  });

  it("期間が重なる棒は次の段に置き、空いた段は使い回す", () => {
    expect(
      assignTracks([
        { start: 420, end: 479 },
        { start: 386, end: 534 },
        { start: 479, end: 502 },
      ]),
    ).toEqual([1, 0, 1]);
  });

  it("空の配列なら空の配列", () => {
    expect(assignTracks([])).toEqual([]);
  });
});

describe("layoutLane", () => {
  const range = { from: 900, to: 1100 };

  it("横向きで幅の足りない名前は棒の外に出す", () => {
    // ユーグ=カペー 987–996 は 18px。名前 70px は入らない
    const lane = layoutLane(
      [span("hugues", "ユーグ=カペー", 987, 996)],
      range,
      "horizontal",
      measure,
    );
    expect(lane.bars[0]).toMatchObject({ offset: 174, length: 18, track: 0, labelRow: 0 });
    // 名前と期間を 2 行に積んだ太さ
    expect(lane.labelRowSizes).toEqual([38]);
  });

  it("横向きで幅が足りれば棒の中に入れる", () => {
    const lane = layoutLane([span("capet", "カペー朝", 987, 1100)], range, "horizontal", measure);
    expect(lane.bars[0]?.labelRow).toBeNull();
    expect(lane.labelRowSizes).toEqual([]);
  });

  it("外に出したラベルが重なるなら次の段にずらす", () => {
    const lane = layoutLane(
      [span("a", "アアアアアアアア", 1000, 1005), span("b", "イイイ", 1010, 1015)],
      range,
      "horizontal",
      measure,
    );
    // a のラベルは 200px から 96px（期間 9 文字の 90px と間隔 6px）。b は 220px から始まるので重なる
    expect(lane.bars.map((bar) => bar.labelRow)).toEqual([0, 1]);
  });

  it("外に出したラベルが重ならなければ同じ段に置く", () => {
    const lane = layoutLane(
      [span("a", "アア", 1000, 1005), span("b", "イイ", 1050, 1055)],
      range,
      "horizontal",
      measure,
    );
    expect(lane.bars.map((bar) => bar.labelRow)).toEqual([0, 0]);
  });

  it("縦向きは 1 行分の長さがあれば棒の中に入れる", () => {
    // 1 行に 18px（16px と両端の隙間 2px）が要る。9 年（18px）なら中、8 年（16px）なら外
    const lane = layoutLane(
      [span("a", "ユーグ=カペー", 987, 996), span("b", "短い", 1000, 1008)],
      range,
      "vertical",
      measure,
    );
    expect(lane.bars.map((bar) => bar.labelRow)).toEqual([null, 0]);
    // 縦向きのラベルの太さは名前か期間の長いほうの幅
    expect(lane.labelRowSizes).toEqual([96]);
  });

  it("ラベルが範囲の末端を越えるなら extent を伸ばす", () => {
    const lane = layoutLane([span("a", "アアアアア", 1095, 1100)], range, "horizontal", measure);
    expect(lane.extent).toBe(390 + 96);
  });

  it("棒が無い行は段も 0", () => {
    expect(layoutLane([], range, "horizontal", measure)).toEqual({
      bars: [],
      trackCount: 0,
      labelRowSizes: [],
      extent: 400,
    });
  });
});

describe("labelRowStart", () => {
  it("前の段の太さと間隔を足す", () => {
    expect(labelRowStart([38, 20], 0)).toBe(0);
    expect(labelRowStart([38, 20], 1)).toBe(42);
    expect(labelRowsTotal([38, 20])).toBe(66);
    expect(labelRowsTotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/timeline/layout.test.ts`
Expected: FAIL（`./layout` が見つからない）

- [ ] **Step 3: 実装する**

`src/timeline/layout.ts`:

```ts
// 年表の位置の計算。向き（縦／横）に依存しない形で、時間軸方向（along）と
// それに直交する方向（cross）の値を返す。描画側がこれを縦か横に当てはめる
import type { TimelineData } from "../data/timeline";
import { formatPeriod } from "./format";
import type { Span } from "./spans";

export type Orientation = "vertical" | "horizontal";

// 縮尺と寸法。位置の計算に使うので、DESIGN.md のトークンではなくここで持つ
export const PX_PER_YEAR = 2;
export const TICK_STEP = 100;
// 棒の文字 1 行の高さ（DESIGN.md の caption の lineHeight 1.33 × 12px ≒ 16px）
export const LINE_HEIGHT = 16;
// 横向きの棒の太さ（名前と期間の 2 行が入る）と、縦向きの棒の最小の余白
export const BAR_THICKNESS = 36;
export const TRACK_GAP = 4;
export const LABEL_GAP = 6;
// 棒の中に文字を入れるときの余白の合計（両端の 1px の隙間と左右 5px ずつ）
const INSIDE_PADDING = 12;

export type TimeRange = { from: number; to: number };

// 王朝と在位のすべての年を含み、目盛りの区切りにそろえた範囲。データが無ければ null
export function timeRange(data: TimelineData): TimeRange | null {
  const years = [...data.dynasties, ...data.reigns].flatMap((item) => [
    item.start.year,
    item.end.year,
  ]);
  if (years.length === 0) return null;
  const from = Math.floor(Math.min(...years) / TICK_STEP) * TICK_STEP;
  const to = Math.ceil(Math.max(...years) / TICK_STEP) * TICK_STEP;
  return { from, to: to === from ? from + TICK_STEP : to };
}

export function ticks(range: TimeRange): number[] {
  const result: number[] = [];
  for (let year = range.from; year <= range.to; year += TICK_STEP) result.push(year);
  return result;
}

export function yearToOffset(year: number, range: TimeRange): number {
  return (year - range.from) * PX_PER_YEAR;
}

export function rangeLength(range: TimeRange): number {
  return yearToOffset(range.to, range);
}

// 期間が重なる棒を段に分ける。終わりと次の始まりが同じ年なら重ならないものとして同じ段に置く
export function assignTracks(periods: { start: number; end: number }[]): number[] {
  const order = periods
    .map((period, index) => ({ ...period, index }))
    .sort((a, b) => a.start - b.start || a.index - b.index);
  const trackEnds: number[] = [];
  const tracks = new Array<number>(periods.length).fill(0);
  for (const { start, end, index } of order) {
    let track = trackEnds.findIndex((trackEnd) => trackEnd <= start);
    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push(end);
    } else {
      trackEnds[track] = end;
    }
    tracks[index] = track;
  }
  return tracks;
}

export type LabelSize = { nameWidth: number; periodWidth: number };

export type BarLayout = {
  span: Span;
  period: string;
  offset: number; // 時間軸方向の開始位置（px）
  length: number; // 時間軸方向の長さ（px）
  track: number;
  // 棒の外に出すラベルの段。棒の中に収まるなら null
  labelRow: number | null;
};

export type LaneLayout = {
  bars: BarLayout[];
  trackCount: number;
  // 棒の外に出すラベルの段ごとの太さ（cross 方向の px）
  labelRowSizes: number[];
  // ラベルを含めた時間軸方向の末端（px）
  extent: number;
};

function fitsInside(orientation: Orientation, length: number, size: LabelSize): boolean {
  if (orientation === "horizontal") {
    return length >= Math.max(size.nameWidth, size.periodWidth) + INSIDE_PADDING;
  }
  // 縦向きは「名前 期間」を 1 行で入れる（両端の 1px の隙間を除いて 1 行の高さが要る）。
  // 幅が足りない分は省略記号で切る
  return length >= LINE_HEIGHT + 2;
}

// 棒の外に出すラベルの大きさ。横向きは名前と期間を 2 行に積み、棒の下に置く。縦向きは棒の右に置く
function outsideLabelSize(orientation: Orientation, size: LabelSize) {
  const width = Math.max(size.nameWidth, size.periodWidth) + LABEL_GAP;
  const height = LINE_HEIGHT * 2 + LABEL_GAP;
  return orientation === "horizontal"
    ? { along: width, cross: height }
    : { along: height, cross: width };
}

export function layoutLane(
  spans: Span[],
  range: TimeRange,
  orientation: Orientation,
  measure: (text: string) => number,
): LaneLayout {
  const periods = spans.map((span) => ({
    start: yearToOffset(span.start.year, range),
    end: yearToOffset(span.end.year, range),
  }));
  const tracks = assignTracks(periods);

  const bars: BarLayout[] = spans.map((span, i) => {
    const { start, end } = periods[i] ?? { start: 0, end: 0 };
    return {
      span,
      period: formatPeriod(span.start, span.end),
      offset: start,
      length: end - start,
      track: tracks[i] ?? 0,
      labelRow: null,
    };
  });

  const rowEnds: number[] = [];
  const labelRowSizes: number[] = [];
  let extent = rangeLength(range);
  const byOffset = [...bars].sort((a, b) => a.offset - b.offset);
  for (const bar of byOffset) {
    const size = { nameWidth: measure(bar.span.name), periodWidth: measure(bar.period) };
    if (fitsInside(orientation, bar.length, size)) continue;
    const { along, cross } = outsideLabelSize(orientation, size);
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= bar.offset);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(0);
      labelRowSizes.push(0);
    }
    rowEnds[row] = bar.offset + along;
    labelRowSizes[row] = Math.max(labelRowSizes[row] ?? 0, cross);
    bar.labelRow = row;
    extent = Math.max(extent, bar.offset + along);
  }

  return {
    bars,
    trackCount: bars.length === 0 ? 0 : Math.max(...tracks) + 1,
    labelRowSizes,
    extent,
  };
}

// ラベルの段 row が始まる位置（棒の段の後ろからの cross 方向の px）
export function labelRowStart(labelRowSizes: number[], row: number): number {
  return labelRowSizes.slice(0, row).reduce((sum, size) => sum + size + TRACK_GAP, 0);
}

// ラベルの段すべてを合わせた太さ
export function labelRowsTotal(labelRowSizes: number[]): number {
  return labelRowStart(labelRowSizes, labelRowSizes.length);
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test src/timeline/layout.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS（17 件）

- [ ] **Step 5: コミットする**

```bash
git add src/timeline/layout.ts src/timeline/layout.test.ts
git commit -m "Compute orientation-independent timeline layout with tracks and outside labels"
```

---

### Task 7: 向きの初期値と中央の年を保つ計算

**Files:**
- Create: `src/timeline/scroll.ts`
- Test: `src/timeline/scroll.test.ts`

**Interfaces:**
- Consumes: Task 6 の `Orientation` `PX_PER_YEAR` `TimeRange`
- Produces:
  - `initialOrientation(width: number, height: number): Orientation`
  - `centerYear(scrollStart: number, viewport: number, axisOffset: number, range: TimeRange): number`
  - `scrollStartFor(year: number, viewport: number, axisOffset: number, range: TimeRange, maxScroll: number): number`

- [ ] **Step 1: 失敗するテストを書く**

`src/timeline/scroll.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { centerYear, initialOrientation, scrollStartFor } from "./scroll";

const range = { from: 400, to: 1700 };

describe("initialOrientation", () => {
  it("横長なら横、縦長や正方形なら縦", () => {
    expect(initialOrientation(1280, 800)).toBe("horizontal");
    expect(initialOrientation(375, 667)).toBe("vertical");
    expect(initialOrientation(600, 600)).toBe("vertical");
  });
});

describe("centerYear と scrollStartFor", () => {
  it("中央の年を求め、同じ年が中央に来るスクロール量に戻せる", () => {
    // 横向き（見出しなし）で 1200 年が中央: (1200-400)*2 - 400/2 = 1400
    expect(centerYear(1400, 400, 0, range)).toBe(1200);
    expect(scrollStartFor(1200, 400, 0, range, 5000)).toBe(1400);
  });

  it("縦向きは先頭の見出しの分を除いて中央を求める", () => {
    // 表示 600px のうち見出し 32px。中央は 1400 + 284 = 1684px → 1242 年
    expect(centerYear(1400, 600, 32, range)).toBe(1242);
    expect(scrollStartFor(1242, 600, 32, range, 5000)).toBe(1400);
  });

  it("縦から横に切り替えても同じ年が中央に来る", () => {
    const year = centerYear(900, 600, 32, range);
    const start = scrollStartFor(year, 1280, 0, range, 5000);
    expect(centerYear(start, 1280, 0, range)).toBeCloseTo(year);
  });

  it("先頭や末尾を越えるスクロール量は範囲に収める", () => {
    expect(scrollStartFor(400, 600, 32, range, 5000)).toBe(0);
    expect(scrollStartFor(1700, 600, 0, range, 2000)).toBe(2000);
  });

  it("スクロールできない（内容が画面より短い）なら 0", () => {
    expect(scrollStartFor(1200, 600, 0, range, -10)).toBe(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm test src/timeline/scroll.test.ts`
Expected: FAIL（`./scroll` が見つからない）

- [ ] **Step 3: 実装する**

`src/timeline/scroll.ts`:

```ts
// 向きの初期値と、切り替えの前後で画面中央の年を保つための計算
import { type Orientation, PX_PER_YEAR, type TimeRange } from "./layout";

// 開いたときの画面が横長なら横、そうでなければ縦（spec §3.2）
export function initialOrientation(width: number, height: number): Orientation {
  return width > height ? "horizontal" : "vertical";
}

// scrollStart: 時間軸方向のスクロール量。viewport: 時間軸方向の表示領域の長さ。
// axisOffset: 時間軸方向の先頭に貼り付いている見出しの長さ（縦向きの行の見出し）
export function centerYear(
  scrollStart: number,
  viewport: number,
  axisOffset: number,
  range: TimeRange,
): number {
  return range.from + (scrollStart + (viewport - axisOffset) / 2) / PX_PER_YEAR;
}

// year が画面中央に来るスクロール量。スクロールできる範囲 [0, maxScroll] に収める
export function scrollStartFor(
  year: number,
  viewport: number,
  axisOffset: number,
  range: TimeRange,
  maxScroll: number,
): number {
  const start = (year - range.from) * PX_PER_YEAR - (viewport - axisOffset) / 2;
  return Math.min(Math.max(start, 0), Math.max(maxScroll, 0));
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `pnpm test src/timeline/scroll.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS（6 件）

- [ ] **Step 5: コミットする**

```bash
git add src/timeline/scroll.ts src/timeline/scroll.test.ts
git commit -m "Pick the initial orientation and keep the centered year across switches"
```

---

### Task 8: ★ DESIGN.md とトークン生成

**Files:**
- Create: `DESIGN.md`, `scripts/lib/themeCss.ts`, `scripts/tokens.ts`, `src/app/theme.css`（生成物）
- Test: `scripts/lib/themeCss.test.ts`
- Modify: `src/app/index.css`, `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: なし
- Produces:
  - Tailwind のユーティリティ: `bg-surface` `text-on-surface` `bg-primary` `text-on-primary` `text-muted` `border-muted` `border-border` `border-grid` `bg-bar-a` `bg-bar-b` `text-on-bar` `bg-error-surface` `text-on-error-surface` `rounded-sm|md` `p-/m-/gap-/px-/py-` の `xs|sm|md` `font-body|label|heading|caption` `text-body|label|heading|caption`
  - `toThemeCss(exported: string): string`、`formatFontFamily(value: string): string`
  - `pnpm tokens`

トークンの**名前**はこの計画で固定する。**値**は Step 1 のデザインレビューで変わってもよい。ダークモードを求められた場合は、名前の追加が要るので BLOCKED にして計画を相談する。

- [ ] **Step 1: ★ デザインのモックをレビューしてもらう（コントローラーが行う）**

コントローラーは `artifact-design` スキルを読み込み、次の DESIGN.md の値を使った HTML モックを Artifact で公開する（private）。モックに含めるもの（文言は spec §6 の一覧と MVP のデータの名前だけ）:

- スマートフォン幅（375px）の縦・王（初期表示の向き）と、横・王（棒の外のラベルが出る状態）
- PC 幅の横・王朝
- 読み込み中とエラーの表示

ユーザーの修正を反映してモックを更新し、承認を得るまで Step 2 に進まない。

`DESIGN.md`（front matter の値は承認されたものにする。本文はこのまま）:

```markdown
---
version: alpha
name: 世界史年表
description: 世界史の王朝と王の移り変わりを年表で確かめるための、装飾を抑えたシンプルなデザイン
colors:
  primary: "#1f3a5f"
  on-primary: "#ffffff"
  surface: "#ffffff"
  on-surface: "#1f2328"
  muted: "#5b6570"
  border: "#d5dbe1"
  grid: "#eceef1"
  bar-a: "#e3e8ef"
  bar-b: "#cbd5e2"
  on-bar: "#1d2533"
  error-surface: "#fdecea"
  on-error-surface: "#8a1c12"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  heading:
    fontFamily: "system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
rounded:
  sm: 3px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
components:
  toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
  toggle-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  lane-heading:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.heading}"
  year-tick:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  grid-line:
    backgroundColor: "{colors.grid}"
  bar:
    backgroundColor: "{colors.bar-a}"
    textColor: "{colors.on-bar}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  bar-alt:
    backgroundColor: "{colors.bar-b}"
    textColor: "{colors.on-bar}"
  outside-label:
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
  divider:
    backgroundColor: "{colors.border}"
  error-message:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.on-error-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

# 世界史年表

## Overview

受験生・学習者が、世界史の王朝と王の移り変わりを年表で確かめるための画面。装飾を抑え、年表の棒と名前を主役にする。

## Colors

- `surface`・`on-surface`: 画面の地と文字
- `primary`・`on-primary`: 切り替えボタンの選ばれている側
- `muted`: 年の目盛り、棒の中の期間、棒の外のラベルの引き出し線
- `border`: 見出しと行の区切り線（`divider`）
- `grid`: 100 年ごとの目盛りの線
- `bar-a`・`bar-b`: 棒の地。同じ行で隣り合う棒を見分けるため、交互に使う
- `on-bar`: 棒の中の名前
- `error-surface`・`on-error-surface`: 読み込みに失敗したときのメッセージ

## Typography

- `body`: 読み込み中の表示とエラー
- `label`: 切り替えボタン
- `heading`: 行（国・地域）の名前
- `caption`: 棒の名前と期間、棒の外のラベル、年の目盛り。行の高さは `src/timeline/layout.ts` の `LINE_HEIGHT`（16px）で固定する

## Layout

- 画面の上部に切り替えボタン 2 つ（左に主題、右に向き）、その下を年表が占める
- 年表の縮尺と棒の寸法は、位置の計算に使うため `src/timeline/layout.ts` と `src/timeline/Timeline.tsx` の定数で持つ（1 年 = 2px、横向きの棒の太さ 36px）
- 縦向きは、左端に年の目盛り（幅 48px）、上端に行の名前を貼り付け、行を列として等分に並べる（1 列の最小幅 120px）
- 横向きは、上端に年の目盛り、各行の左上に行の名前を貼り付ける

## Elevation & Depth

影は使わない。見出しの区切りは `divider` の線だけで表す。

## Shapes

- 棒とエラーのメッセージは `sm`
- 切り替えボタンの枠は `md`

## Components

- `toggle`・`toggle-active`: 切り替えボタン（通常と、選ばれている側）
- `lane-heading`: 行の名前
- `year-tick`・`grid-line`: 年の目盛りの文字と線
- `bar`・`bar-alt`: 棒（交互に使う）
- `outside-label`: 棒に収まらない名前を棒の外に出したラベル
- `divider`: 見出しと行の区切り線
- `error-message`: 読み込みに失敗したときのメッセージ

## Do's and Don'ts

- 色・角丸・余白・文字は front matter のトークンだけを使い、コードに値を直接書かない
- spec の UI 文言の一覧にない文言を足さない
- 棒に影やグラデーションを付けない
```

- [ ] **Step 2: 失敗するテストを書く**

`scripts/lib/themeCss.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatFontFamily, toThemeCss } from "./themeCss";

describe("formatFontFamily", () => {
  it("フォント名は引用符で囲み、総称ファミリーは囲まない", () => {
    expect(formatFontFamily("Hiragino Sans, Noto Sans JP, sans-serif")).toBe(
      '"Hiragino Sans", "Noto Sans JP", sans-serif',
    );
    expect(formatFontFamily("system-ui, sans-serif")).toBe("system-ui, sans-serif");
  });
});

describe("toThemeCss", () => {
  const exported = [
    "@theme {",
    "  --color-ocean: #dce8f0;",
    '  --font-body: "system-ui, sans-serif";',
    "  --font-weight-body: 400;",
    "}",
    "",
  ].join("\n");

  it("未使用の変数も出力されるよう @theme static にする", () => {
    expect(toThemeCss(exported)).toContain("@theme static {");
    expect(toThemeCss(exported)).not.toContain("@theme {");
  });

  it("フォントの並びを CSS として正しい形に直す", () => {
    expect(toThemeCss(exported)).toContain("  --font-body: system-ui, sans-serif;");
  });

  it("フォントの太さはそのまま残す", () => {
    expect(toThemeCss(exported)).toContain("  --font-weight-body: 400;");
  });

  it("生成物であることを先頭に書く", () => {
    expect(toThemeCss(exported).startsWith("/* DESIGN.md から pnpm tokens で生成")).toBe(true);
  });

  it("@theme ブロックが無ければ例外にする", () => {
    expect(() => toThemeCss(":root {}")).toThrow("@theme");
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `pnpm test scripts/lib/themeCss.test.ts`
Expected: FAIL（`./themeCss` が見つからない）

- [ ] **Step 4: 実装する**

`scripts/lib/themeCss.ts`（world-history-map と同じ）:

```ts
// design.md export --format css-tailwind の出力を Tailwind v4 でそのまま使える形に直す
// - フォントの並び全体が 1 つの名前として引用符で囲まれるので、名前ごとに囲み直す
// - @theme のままだと未使用の変数が出力されず、地図の色を CSS 変数から読めないので static にする

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

export function formatFontFamily(value: string): string {
  return value
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => family !== "")
    .map((family) => (GENERIC_FAMILIES.has(family) ? family : `"${family}"`))
    .join(", ");
}

export function toThemeCss(exported: string): string {
  if (!exported.includes("@theme {")) {
    throw new Error("design.md の出力に @theme ブロックがありません");
  }
  const body = exported
    .replace(
      /^(\s*--font-(?!weight-)[\w-]+:\s*)"([^"]*)";$/gm,
      (_match, prefix: string, value: string) => `${prefix}${formatFontFamily(value)};`,
    )
    .replace("@theme {", "@theme static {")
    .trimEnd();
  return `/* DESIGN.md から pnpm tokens で生成したファイル。直接編集しない */\n${body}\n`;
}
```

`scripts/tokens.ts`:

```ts
// DESIGN.md のトークンから src/app/theme.css を生成する
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { toThemeCss } from "./lib/themeCss";

const exported = execFileSync(
  "pnpm",
  ["exec", "design.md", "export", "--format", "css-tailwind", "DESIGN.md"],
  { encoding: "utf8" },
);
writeFileSync("src/app/theme.css", toThemeCss(exported));
console.log("src/app/theme.css を生成しました");
```

- [ ] **Step 5: トークンを生成して読み込む**

`package.json` の `scripts` に追加する:

```json
"tokens": "tsx scripts/tokens.ts"
```

`src/app/index.css`:

```css
@import "tailwindcss";
@import "./theme.css";
```

```bash
pnpm exec design.md lint DESIGN.md
pnpm tokens
cat src/app/theme.css
```

Expected: lint の errors と warnings が 0。`theme.css` が `@theme static {` で始まり、`--color-bar-a` などがすべて出力され、`--font-caption: system-ui, sans-serif;` になっている。

- [ ] **Step 6: CI に DESIGN.md の検査を足す**

`.github/workflows/ci.yml` の `- run: pnpm test` の後に追加する:

```yaml
      - run: pnpm exec design.md lint DESIGN.md
      - name: Verify generated tokens match DESIGN.md
        run: |
          pnpm tokens
          git diff --exit-code src/app/theme.css
```

- [ ] **Step 7: テストと検査を通してコミットする**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
git add DESIGN.md scripts/tokens.ts scripts/lib src/app/theme.css src/app/index.css package.json .github/workflows/ci.yml
git commit -m "Add DESIGN.md as the single source of design tokens and generate the Tailwind theme"
```

---

### Task 9: 画面の組み立て

**Files:**
- Create: `src/app/ToggleGroup.tsx`, `src/timeline/useTextMeasure.ts`, `src/timeline/Timeline.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: Task 2 の `loadTimeline` `COPY`、Task 5 の `Subject` `spansForLane`、Task 6 のレイアウト、Task 7 の `initialOrientation` `centerYear` `scrollStartFor`、Task 8 のユーティリティ
- Produces: 完成した画面

- [ ] **Step 1: 切り替えボタンを書く**

`src/app/ToggleGroup.tsx`（`fieldset` は暗黙の `role="group"` を持つ）:

```tsx
// aria-pressed のトグルボタンを並べた切り替え
type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ToggleGroup<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <fieldset
      aria-label={label}
      className="inline-flex overflow-hidden rounded-md border border-border font-label text-label"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="px-md py-xs aria-pressed:bg-primary aria-pressed:text-on-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 2: 文字幅の測定を書く**

`src/timeline/useTextMeasure.ts`:

```ts
// フォントを読み込んだ後に、棒の文字と同じフォントで文字列の幅を測る関数を返す
import { type RefObject, useEffect, useState } from "react";

export type Measure = (text: string) => number;

export function useTextMeasure(probe: RefObject<HTMLElement | null>): Measure | null {
  const [measure, setMeasure] = useState<Measure | null>(null);

  useEffect(() => {
    let active = true;
    document.fonts.ready.then(() => {
      const element = probe.current;
      if (!active || !element) return;
      const style = getComputedStyle(element);
      const context = document.createElement("canvas").getContext("2d");
      if (!context) {
        // canvas が使えない環境では、全角 1 文字 = フォントサイズとして見積もる
        const size = Number.parseFloat(style.fontSize);
        setMeasure(() => (text: string) => text.length * size);
        return;
      }
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      setMeasure(() => (text: string) => context.measureText(text).width);
    });
    return () => {
      active = false;
    };
  }, [probe]);

  return measure;
}
```

- [ ] **Step 3: 年表の描画を書く**

`src/timeline/Timeline.tsx`:

```tsx
// 年表の描画。layout.ts の結果（along / cross）を縦か横に当てはめる
import { type CSSProperties, useLayoutEffect, useMemo, useRef } from "react";
import { COPY } from "../app/copy";
import type { TimelineData } from "../data/timeline";
import {
  BAR_THICKNESS,
  type BarLayout,
  LABEL_GAP,
  type LaneLayout,
  LINE_HEIGHT,
  labelRowStart,
  labelRowsTotal,
  layoutLane,
  type Orientation,
  rangeLength,
  type TimeRange,
  TRACK_GAP,
  ticks,
  timeRange,
  yearToOffset,
} from "./layout";
import { centerYear, scrollStartFor } from "./scroll";
import { type Subject, spansForLane } from "./spans";
import { useTextMeasure } from "./useTextMeasure";

// 見出しの寸法（位置の計算に使う）
const LANE_NAME_HEIGHT = 24; // 横向きの行の名前
const AXIS_HEIGHT = 24; // 横向きの年の目盛り
const HEADER_HEIGHT = 32; // 縦向きの行の見出し
const AXIS_WIDTH = 48; // 縦向きの年の目盛り
const MIN_COLUMN_WIDTH = 120; // 縦向きの 1 行（列）の最小幅

type Props = { data: TimelineData; subject: Subject; orientation: Orientation };

export function Timeline({ data, subject, orientation }: Props) {
  const scrollerRef = useRef<HTMLElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const centerRef = useRef<number | null>(null);
  const measure = useTextMeasure(probeRef);
  const range = useMemo(() => timeRange(data), [data]);
  const axisOffset = orientation === "vertical" ? HEADER_HEIGHT : 0;

  const lanes = useMemo(() => {
    if (!range || !measure) return null;
    return data.lanes.map((lane) => ({
      lane,
      layout: layoutLane(spansForLane(data, lane, subject), range, orientation, measure),
    }));
  }, [data, subject, orientation, range, measure]);

  // 切り替えの前に中央にあった年を、切り替えの後も中央に置く
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const year = centerRef.current;
    if (!scroller || !range || !lanes || year === null) return;
    if (orientation === "vertical") {
      scroller.scrollTop = scrollStartFor(
        year,
        scroller.clientHeight,
        axisOffset,
        range,
        scroller.scrollHeight - scroller.clientHeight,
      );
    } else {
      scroller.scrollLeft = scrollStartFor(
        year,
        scroller.clientWidth,
        axisOffset,
        range,
        scroller.scrollWidth - scroller.clientWidth,
      );
    }
  }, [orientation, range, lanes, axisOffset]);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller || !range) return;
    centerRef.current =
      orientation === "vertical"
        ? centerYear(scroller.scrollTop, scroller.clientHeight, axisOffset, range)
        : centerYear(scroller.scrollLeft, scroller.clientWidth, axisOffset, range);
  }

  return (
    <section
      ref={scrollerRef}
      onScroll={handleScroll}
      aria-label={COPY.timelineLabel}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: キーボードでスクロールできるようにする
      tabIndex={0}
      className="relative h-full overflow-auto focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span
        ref={probeRef}
        aria-hidden="true"
        className="invisible absolute font-caption text-caption"
      >
        あ
      </span>
      {range &&
        lanes &&
        (orientation === "horizontal" ? (
          <Horizontal range={range} lanes={lanes} />
        ) : (
          <Vertical range={range} lanes={lanes} />
        ))}
    </section>
  );
}

type LaneEntry = { lane: TimelineData["lanes"][number]; layout: LaneLayout };

function contentLength(range: TimeRange, lanes: LaneEntry[]): number {
  return Math.max(rangeLength(range), ...lanes.map(({ layout }) => layout.extent));
}

function barClass(index: number): string {
  return `absolute overflow-hidden rounded-sm text-on-bar ${index % 2 === 0 ? "bg-bar-a" : "bg-bar-b"}`;
}

const textStyle: CSSProperties = { lineHeight: `${LINE_HEIGHT}px` };

// 棒の外に出すラベル。引き出し線（横向きは左、縦向きは上の罫線）で棒とつなぐ
function OutsideLabel({
  bar,
  className,
  style,
}: {
  bar: BarLayout;
  className: string;
  style: CSSProperties;
}) {
  return (
    <div
      className={`absolute whitespace-nowrap border-muted font-caption text-caption text-on-surface ${className}`}
      style={{ ...textStyle, ...style }}
    >
      <div>{bar.span.name}</div>
      <div className="text-muted">{bar.period}</div>
    </div>
  );
}

function Horizontal({ range, lanes }: { range: TimeRange; lanes: LaneEntry[] }) {
  const length = contentLength(range, lanes);
  const years = ticks(range);
  return (
    <div className="relative" style={{ width: length }}>
      <div
        className="sticky top-0 z-20 border-b border-border bg-surface"
        style={{ height: AXIS_HEIGHT }}
      >
        {years.map((year) => (
          <span
            key={year}
            className="absolute top-1 pl-1 font-caption text-caption text-muted"
            style={{ left: yearToOffset(year, range) }}
          >
            {year}
          </span>
        ))}
      </div>
      {lanes.map(({ lane, layout }) => {
        const barsEnd = LANE_NAME_HEIGHT + layout.trackCount * (BAR_THICKNESS + TRACK_GAP);
        const height = barsEnd + labelRowsTotal(layout.labelRowSizes) + TRACK_GAP;
        return (
          <section key={lane.id} className="relative border-b border-border" style={{ height }}>
            {years.map((year) => (
              <div
                key={year}
                className="absolute top-0 bottom-0 border-l border-grid"
                style={{ left: yearToOffset(year, range) }}
              />
            ))}
            <h2 className="sticky left-0 z-10 inline-block border-r border-b border-border bg-surface px-2 font-heading text-heading">
              {lane.name}
            </h2>
            {layout.bars.map((bar, i) => (
              <div
                key={bar.span.id}
                className={`${barClass(i)} px-1 font-caption text-caption`}
                style={{
                  ...textStyle,
                  left: bar.offset + 1,
                  width: Math.max(bar.length - 2, 1),
                  top: LANE_NAME_HEIGHT + bar.track * (BAR_THICKNESS + TRACK_GAP),
                  height: BAR_THICKNESS,
                  paddingTop: (BAR_THICKNESS - LINE_HEIGHT * 2) / 2,
                }}
              >
                {bar.labelRow === null && (
                  <>
                    <div className="truncate">{bar.span.name}</div>
                    <div className="truncate">{bar.period}</div>
                  </>
                )}
              </div>
            ))}
            {layout.bars.map(
              (bar) =>
                bar.labelRow !== null && (
                  <OutsideLabel
                    key={bar.span.id}
                    bar={bar}
                    className="border-l"
                    style={{
                      left: bar.offset + 1,
                      top: barsEnd + labelRowStart(layout.labelRowSizes, bar.labelRow),
                      paddingLeft: LABEL_GAP / 2,
                    }}
                  />
                ),
            )}
          </section>
        );
      })}
    </div>
  );
}

function Vertical({ range, lanes }: { range: TimeRange; lanes: LaneEntry[] }) {
  const length = contentLength(range, lanes);
  const years = ticks(range);
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `${AXIS_WIDTH}px repeat(${lanes.length}, minmax(${MIN_COLUMN_WIDTH}px, 1fr))`,
      }}
    >
      <div
        className="sticky top-0 left-0 z-30 border-b border-border bg-surface"
        style={{ height: HEADER_HEIGHT }}
      />
      {lanes.map(({ lane }) => (
        <h2
          key={lane.id}
          className="sticky top-0 z-20 flex items-center border-b border-l border-border bg-surface px-2 font-heading text-heading"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="truncate">{lane.name}</span>
        </h2>
      ))}
      <div className="sticky left-0 z-10 bg-surface" style={{ height: length }}>
        {years.map((year) => (
          <span
            key={year}
            className="absolute left-1 font-caption text-caption text-muted"
            style={{ top: yearToOffset(year, range) }}
          >
            {year}
          </span>
        ))}
      </div>
      {lanes.map(({ lane, layout }) => {
        const reserve = labelRowsTotal(layout.labelRowSizes);
        const tracks = Math.max(layout.trackCount, 1);
        return (
          <section
            key={lane.id}
            aria-label={lane.name}
            className="relative border-l border-border"
            style={{ height: length }}
          >
            {years.map((year) => (
              <div
                key={year}
                className="absolute right-0 left-0 border-t border-grid"
                style={{ top: yearToOffset(year, range) }}
              />
            ))}
            {layout.bars.map((bar, i) => (
              <div
                key={bar.span.id}
                className={`${barClass(i)} truncate px-1 font-caption text-caption`}
                style={{
                  ...textStyle,
                  top: bar.offset + 1,
                  height: Math.max(bar.length - 2, 1),
                  left: `calc(${bar.track} * (100% - ${reserve}px) / ${tracks} + ${TRACK_GAP}px)`,
                  width: `calc((100% - ${reserve}px) / ${tracks} - ${TRACK_GAP * 2}px)`,
                  paddingTop: 1,
                }}
              >
                {bar.labelRow === null && (
                  <>
                    {bar.span.name}
                    <span className="ml-1 text-muted">{bar.period}</span>
                  </>
                )}
              </div>
            ))}
            {layout.bars.map(
              (bar) =>
                bar.labelRow !== null && (
                  <OutsideLabel
                    key={bar.span.id}
                    bar={bar}
                    className="border-t"
                    style={{
                      top: bar.offset + 1,
                      left: `calc(100% - ${reserve}px + ${labelRowStart(layout.labelRowSizes, bar.labelRow)}px)`,
                      paddingTop: LABEL_GAP / 2,
                    }}
                  />
                ),
            )}
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 画面を組み立てる**

`src/app/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { loadTimeline } from "../data/loadTimeline";
import type { TimelineData } from "../data/timeline";
import timelineUrl from "../data/timeline.json?url";
import type { Orientation } from "../timeline/layout";
import { initialOrientation } from "../timeline/scroll";
import type { Subject } from "../timeline/spans";
import { Timeline } from "../timeline/Timeline";
import { COPY } from "./copy";
import { ToggleGroup } from "./ToggleGroup";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: TimelineData };

const SUBJECTS = [
  { value: "dynasty", label: COPY.subjectDynasty },
  { value: "reign", label: COPY.subjectReign },
] as const;

const ORIENTATIONS = [
  { value: "vertical", label: COPY.orientationVertical },
  { value: "horizontal", label: COPY.orientationHorizontal },
] as const;

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [subject, setSubject] = useState<Subject>("dynasty");
  const [orientation, setOrientation] = useState<Orientation>(() =>
    initialOrientation(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    let active = true;
    loadTimeline(window.fetch.bind(window), timelineUrl).then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      (error: unknown) => {
        console.error(error);
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-surface font-body text-body text-on-surface">
      <header className="flex items-center justify-between gap-sm border-b border-border p-sm">
        <ToggleGroup
          label={COPY.subjectLabel}
          options={SUBJECTS}
          value={subject}
          onChange={setSubject}
        />
        <ToggleGroup
          label={COPY.orientationLabel}
          options={ORIENTATIONS}
          value={orientation}
          onChange={setOrientation}
        />
      </header>
      <main className="min-h-0 flex-1">
        {state.status === "loading" && <p className="p-md text-muted">{COPY.loading}</p>}
        {state.status === "error" && (
          <p role="alert" className="m-md rounded-sm bg-error-surface p-sm text-on-error-surface">
            {COPY.loadError}
          </p>
        )}
        {state.status === "ready" && (
          <Timeline data={state.data} subject={subject} orientation={orientation} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: 検査を通す**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

Expected: すべて成功。

- [ ] **Step 6: 実ブラウザで確かめる**

データはまだ空なので、確かめる間だけ試験用のデータを置く（コミットしない）。`src/data/timeline.json` を一時的に次の内容にする（名前は画面の確認用の仮のもの）:

```bash
node -e '
const y = (year) => ({ year, circa: false });
const lanes = [
  { id: "a", name: "行A", dynasties: ["a1", "a2"], reigns: ["r1", "r2", "r3"] },
  { id: "b", name: "行B", dynasties: ["b1"], reigns: ["r4", "r5"] },
];
const dynasties = [
  { id: "a1", name: "王朝A1", start: y(481), end: y(751) },
  { id: "a2", name: "王朝A2", start: y(751), end: y(987) },
  { id: "b1", name: "王朝B1", start: y(1016), end: y(1042) },
];
const reigns = [
  ["r1", 481, 511], ["r2", 987, 996], ["r3", 1180, 1223], ["r4", 1016, 1035], ["r5", 1066, 1087],
].map(([id, s, e]) => ({ id, personId: id, start: y(s), end: y(e) }));
const people = reigns.map((r, i) => ({ id: r.id, name: "人物" + "ABCDE"[i] + "世" }));
require("fs").writeFileSync("src/data/timeline.json", JSON.stringify({ lanes, dynasties, people, reigns }));
'
pnpm build
```

スクラッチパッドで Playwright を使い（`executablePath: "/opt/pw-browsers/chromium"`。リポの依存には入れない）、`pnpm preview` の URL を 1280×800 と 375×667 で開いて次を確かめ、スクリーンショットを見る:

1. 初期の向きが 1280×800 で「横」、375×667 で「縦」。主題は「王朝」
2. 縦・横 × 王朝・王の 4 通りすべてで棒が描かれ、棒の外のラベル（`section .absolute.whitespace-nowrap`）どうしが重ならない（各要素の `getBoundingClientRect` を総当たりで比べる）
3. 縦で 1200 年あたりまでスクロールしてから「横」を押すと、1200 年あたりが中央に来る
4. Tab キーで切り替えボタンと年表の領域にフォーカスが移り、フォーカスの枠が見える
5. `src/data/timeline.json` を `{}` にしてビルドし直すと、エラーの文言が出る

確かめ終わったら元に戻す:

```bash
git checkout -- src/data/timeline.json
git status --short src/data
```

Expected: `git status` に `src/data/timeline.json` が出ない。

- [ ] **Step 7: コミットする**

```bash
git add src
git commit -m "Render the timeline with subject and orientation switches"
```

---

### Task 10: ★ データの取り込み

**このタスクはコントローラーが行う。data リポ（world-history-timeline-data）の Task 4（データの承認）が終わってから行う。**

**Files:**
- Modify: `src/data/timeline.json`

- [ ] **Step 1: data リポで成果物を作ってコピーする**

```bash
cd ../world-history-timeline-data && pnpm build && pnpm copy ../world-history-timeline && cd ../world-history-timeline
node -e 'const d = require("./src/data/timeline.json"); console.log(d.lanes.length, d.dynasties.length, d.people.length, d.reigns.length)'
```

Expected: `2 10 19 19`。

- [ ] **Step 2: 実ブラウザで確かめる**

Task 9 の Step 6 の 1〜4 を、実データで確かめる。加えて:

- 横・王で、ユーグ=カペー・クヌート・ウィリアム1世の名前が棒の外に出て、重ならずに読める
- 縦・王で、ユーグ=カペー（987–996）の名前が棒の中に入る
- ジョン王とヘンリ3世が同じ段に並ぶ

スクリーンショット（375px の縦・王、1280px の横・王）をユーザーに送る。

- [ ] **Step 3: コミットする**

```bash
git add src/data/timeline.json
git commit -m "Add MVP timeline data for the Frankish kingdom, France and England"
git push
```

---

### Task 11: CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: CLAUDE.md を書く**

`CLAUDE.md`（コードや rule で分かることは書かない）:

````markdown
# 世界史年表

受験生・学習者向けに、世界史の王朝や王の移り変わりを年表で確かめる Web アプリ。

共通のルールは akihiro-tj/house-rules から APM で入れている（`.claude/rules/` の多くは生成物。`apm.yml` を参照）。

## 守ること

- 年表データも、利用者の目に触れるコンテンツとして扱う。自分で考えて足したり変えたりせず、案を示して承認を得る

## 検証

- 画面を変えたら、表示の切り替え（主題・向き）のすべての組み合わせで確かめる。組み合わせによって棒や名前の出方が変わる
````

- [ ] **Step 2: コミットする**

```bash
git add CLAUDE.md
git commit -m "Add CLAUDE.md"
```

---

### Task 12: ★ ルールセットと最終確認

**このタスクはコントローラーが行う。**

- [ ] **Step 1: ブランチ全体をレビューする**

`requesting-code-review` スキルで、最上位のモデルのレビュアーにブランチ全体（main との差分）を見てもらう。spec との整合、Review Focus の 5 項目、UI 文言が §6 の一覧だけか、トークンの直書きが無いかを重点的に見てもらう。指摘は修正してから次へ進む。

- [ ] **Step 2: spec と計画を実装に合わせる**

実装中に変わったこと（スパイクの結果、DESIGN.md の値など）が spec に反映されているか確認し、足りなければ更新してコミットする。

- [ ] **Step 3: ★ ルールセットを適用してもらう**

`CI` の `Check and build` が一度動いた後に、ユーザーに依頼する:

> house-rules のディレクトリで次を実行し、world-history-timeline の main にルールセットを適用してください（`gh` に管理者権限でログインしている必要があります）。
>
> ```sh
> bash scripts/apply-ruleset.sh akihiro-tj/world-history-timeline "Check and build"
> ```

- [ ] **Step 4: ★ PR をレビュー待ちにし、実機で確認してもらう**

PR をドラフトから外し、本文を最新の状態に更新する。ユーザーに依頼する:

> プレビュー URL を PC とスマートフォンの実機で開き、縦・横と王朝・王の切り替え、スクロールを確認してください。問題なければ PR をマージしてください。

- [ ] **Step 5: マージ後に本番と dependabot を確認する**

1. `Deploy` ワークフローが成功し、スモークテストが通っていること
2. ユーザーに Actions の `APM update` を `workflow_dispatch` で一度実行してもらい、成功すること
3. ユーザーに、GitHub の Insights → Dependency graph → Dependabot で npm のマニフェストがエラーなく読まれているか確認してもらう
4. 結果を spec §5.3 のスパイクの結果に追記する（新しいブランチで PR を作る）
