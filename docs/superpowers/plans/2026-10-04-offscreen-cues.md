# 棒の名前の貼り付けと「次の駅」の案内 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 長い棒の名前と期間を画面の端に貼り付け、見えている範囲が空の行に、前後のいちばん近い棒への案内を出す。

**Architecture:** 名前の貼り付けは CSS だけで行う（棒を `overflow: clip` にし、棒の中の文字に `position: sticky`）。案内は、見えている範囲（`visibleRange`）と行の棒（`BarLayout`）から前後の棒を選ぶ純粋な関数（`nearbyBars`）を `src/timeline/nearby.ts` に置き、`Timeline.tsx` がスクロールのたびに呼ぶ。結果が変わったときだけ描き直し、案内は行全体に広げた層の両端に `sticky` で貼る。タップしたときのスクロール量は `src/timeline/scroll.ts` の `centerScroll` で求める。

**Tech Stack:** React 19、TypeScript、Vite、Tailwind CSS 4、Vitest（node 環境）、Biome、pnpm

**Spec:** `docs/superpowers/specs/2026-10-04-offscreen-cues-design.md`

## Global Constraints

- コミットメッセージは英語。コード内コメント・テスト名・ドキュメントは日本語
- ブランチ `claude/yoroshiku-onegaishimasu-r2wpv7` で作業する。main に直接コミットしない
- UI 文言は spec §5 のものだけ。案内の読み上げは「{名前}へ移動」。向きの印はシェブロンのアイコン（文字の矢印は使わない）で、読み上げない
- 色・角丸・余白・文字は DESIGN.md のトークンだけを使う
- `src/data/timeline.json` は変えない
- 各タスクの終わりに `pnpm exec biome ci .`・`pnpm typecheck`・`pnpm test`・`pnpm build` がすべて通る
- テストの期待値を観測値に合わせて書き換えない。計画と食い違ったらブロックとして報告する

## Review Focus

- 棒の終わりが見えている範囲の始まりにちょうど接する: 棒は見えていない扱いにし、前の案内に出す（Task 1 のテスト）
- 棒の外のラベルだけが見えている範囲にかかる: 行は空ではないので案内を出さない（Task 1 のテスト）
- スマホのシートを全画面に広げた（見えている範囲の長さが 0 以下）: 案内を出さない（Task 1 のテスト）
- 年表の端の棒へのスクロールが、スクロールできる範囲を越える: 端で止まる（Task 1 のテスト）
- 向きや表示を切り替えた直後: 古い配置の棒を指した案内が残らない（Task 3 の実ブラウザ）

---

### Task 1: 前後の棒と、スクロール量の計算

**Files:**
- Create: `src/timeline/nearby.ts`, `src/timeline/nearby.test.ts`
- Modify: `src/timeline/layout.ts`（`BarLayout` に `reach` を足す）, `src/timeline/layout.test.ts`, `src/timeline/scroll.ts`, `src/timeline/scroll.test.ts`

**Interfaces:**
- Produces:
  - `BarLayout.reach: number` — 棒の外のラベルを含めた、時間軸方向の終わりの位置（px）。ラベルがなければ `offset + length`
  - `type Nearby = { before: BarLayout | null; after: BarLayout | null }`
  - `visibleRange(scrollStart: number, viewport: number, visibleRatio: number, header: number): { start: number; end: number }`
  - `nearbyBars(bars: BarLayout[], range: { start: number; end: number }): Nearby | null`
  - `centerScroll(position: number, visibleLength: number, maxScroll: number): number`

- [ ] **Step 1: 失敗するテストを書く**

`src/timeline/nearby.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BarLayout } from "./layout";
import { nearbyBars, visibleRange } from "./nearby";

// テストに要る項目だけを持つ棒
const bar = (id: string, offset: number, length: number, track = 0, reach = offset + length) =>
  ({ span: { id }, offset, length, track, reach }) as unknown as BarLayout;
const ids = (result: ReturnType<typeof nearbyBars>) =>
  result && { before: result.before?.span.id ?? null, after: result.after?.span.id ?? null };

describe("visibleRange", () => {
  it("横向きは表示領域の幅がそのまま見えている範囲", () => {
    expect(visibleRange(300, 375, 1, 0)).toEqual({ start: 300, end: 675 });
  });

  it("縦向きは見出しの分と、シートに隠れた分を除く", () => {
    // 高さ 600px のうち見えているのは上 44%（264px）。見出し 32px を除いて 232px
    expect(visibleRange(1000, 600, 0.44, 32)).toEqual({ start: 1000, end: 1232 });
  });
});

describe("nearbyBars", () => {
  const bars = [bar("a", 0, 100), bar("b", 500, 100), bar("c", 900, 50)];

  it("見えている範囲にかかる棒があれば null", () => {
    expect(nearbyBars(bars, { start: 550, end: 700 })).toBeNull();
  });

  it("空なら前後のいちばん近い棒を返す", () => {
    expect(ids(nearbyBars(bars, { start: 650, end: 850 }))).toEqual({ before: "b", after: "c" });
  });

  it("片側にしか棒がなければ、もう片側は null", () => {
    expect(ids(nearbyBars(bars, { start: 1000, end: 1200 }))).toEqual({ before: "c", after: null });
    expect(ids(nearbyBars(bars, { start: -300, end: -100 }))).toEqual({ before: null, after: "a" });
  });

  it("範囲の端にちょうど接する棒は見えていない扱い", () => {
    expect(ids(nearbyBars(bars, { start: 600, end: 900 }))).toEqual({ before: "b", after: "c" });
  });

  it("棒の外のラベルだけが範囲にかかっていても null", () => {
    const labeled = [bar("a", 0, 20, 0, 120), bar("b", 500, 100)];
    expect(nearbyBars(labeled, { start: 100, end: 300 })).toBeNull();
  });

  it("前の棒は、ラベルを含めた終わりがいちばん遅い棒", () => {
    const labeled = [bar("long", 0, 300), bar("short", 250, 20, 1, 340)];
    expect(ids(nearbyBars(labeled, { start: 400, end: 600 }))?.before).toBe("short");
  });

  it("同じ位置なら段の小さい棒", () => {
    const tied = [bar("upper", 500, 100, 0), bar("lower", 500, 200, 1)];
    expect(ids(nearbyBars(tied, { start: 0, end: 300 }))?.after).toBe("upper");
  });

  it("棒が 1 本もない行や、見えている範囲の長さがないときは null", () => {
    expect(nearbyBars([], { start: 0, end: 300 })).toBeNull();
    expect(nearbyBars(bars, { start: 650, end: 640 })).toBeNull();
  });
});
```

`src/timeline/scroll.test.ts` の末尾に足す（import に `centerScroll` を足す）:

```ts
describe("centerScroll", () => {
  it("指定した位置を見えている範囲の中ほどに置く", () => {
    expect(centerScroll(1000, 400, 5000)).toBe(800);
  });

  it("スクロールできる範囲を越えるときは端で止める", () => {
    expect(centerScroll(100, 400, 5000)).toBe(0);
    expect(centerScroll(4900, 400, 4500)).toBe(4500);
    expect(centerScroll(100, 400, -10)).toBe(0);
  });
});
```

`src/timeline/layout.test.ts` の `layoutLane` の describe に足す:

```ts
  it("reach は棒の外のラベルを含めた時間軸方向の終わり", () => {
    // 1 文字 10px。「長い名前の王朝」（70px）は 20 年（40px）の棒に入らず、外に出る
    const { bars } = layoutLane(
      [span("a", "長い名前の王朝", 1000, 1020), span("b", "B", 1100, 1300)],
      { from: 1000, to: 1400 },
      "horizontal",
      measure,
      2026,
    );
    expect(bars[0]?.labelCross).not.toBeNull();
    expect(bars[0]?.reach).toBeGreaterThan(40);
    expect(bars[1]?.reach).toBe(600);
  });
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `pnpm test`
Expected: `nearby.ts` が無い、`centerScroll` が無い、`reach` が `undefined` で FAIL

- [ ] **Step 3: 実装する**

`src/timeline/layout.ts` の `BarLayout` に足す:

```ts
  // 棒の外のラベルを含めた時間軸方向の終わりの位置（px）。ラベルがなければ棒の終わり
  reach: number;
```

`layoutLane` の `bars` の初期値に `reach: end,` を足し、ラベルを置いたところ（`bar.labelCross = cross;` の後）で `bar.reach = Math.max(bar.reach, alongRange.end);` にする。

`src/timeline/nearby.ts`:

```ts
// 見えている範囲が空の行に出す「次の駅」の案内（spec §4）
import type { BarLayout } from "./layout";

export type Nearby = { before: BarLayout | null; after: BarLayout | null };

// 時間軸方向の見えている範囲（px）。scrollStart はスクロール量、viewport は表示領域の長さ、
// visibleRatio は表示領域のうち見えている割合（スマホのシートの上）、header は先頭に貼り付いた見出しの長さ
export function visibleRange(
  scrollStart: number,
  viewport: number,
  visibleRatio: number,
  header: number,
): { start: number; end: number } {
  return { start: scrollStart, end: scrollStart + viewport * visibleRatio - header };
}

// 見えている範囲に棒（棒の外のラベルを含む）が 1 つもかかっていなければ、前後のいちばん近い棒を返す。
// かかっている棒があるとき、棒が 1 本もないとき、範囲の長さがないときは null
export function nearbyBars(
  bars: BarLayout[],
  range: { start: number; end: number },
): Nearby | null {
  if (bars.length === 0 || range.end <= range.start) return null;
  if (bars.some((bar) => bar.offset < range.end && bar.reach > range.start)) return null;
  let before: BarLayout | null = null;
  let after: BarLayout | null = null;
  for (const bar of bars) {
    if (
      bar.reach <= range.start &&
      (!before ||
        bar.reach > before.reach ||
        (bar.reach === before.reach && bar.track < before.track))
    ) {
      before = bar;
    }
    if (
      bar.offset >= range.end &&
      (!after ||
        bar.offset < after.offset ||
        (bar.offset === after.offset && bar.track < after.track))
    ) {
      after = bar;
    }
  }
  return { before, after };
}
```

`src/timeline/scroll.ts` に足す:

```ts
// position（時間軸方向の px）が見えている範囲（長さ visibleLength）の中ほどに来るスクロール量。
// スクロールできる範囲 [0, maxScroll] に収める
export function centerScroll(position: number, visibleLength: number, maxScroll: number): number {
  return Math.min(Math.max(position - visibleLength / 2, 0), Math.max(maxScroll, 0));
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `pnpm test && pnpm typecheck && pnpm exec biome ci .`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/timeline
git commit -m "Find the nearest bars around an empty visible range"
```

---

### Task 2: 棒の名前の貼り付け

**Files:**
- Modify: `src/timeline/Timeline.tsx`

- [ ] **Step 1:** `barClass` の `overflow-hidden` を `overflow-clip` にする（`hidden` だと棒がスクロールの入れ物になり、中の `sticky` が年表のスクロールに効かない）
- [ ] **Step 2:** 横向きの棒の中の文字（名前と期間の 2 つの `span`）を `<span className="sticky left-xs block w-max max-w-full">` で包む
- [ ] **Step 3:** 縦向きの棒の中の文字（`row` と `stack` の両方）を `<span className="sticky block" style={{ top: HEADER_HEIGHT + 1 }}>` で包む
- [ ] **Step 4:** `pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build` が通るのを確かめる
- [ ] **Step 5:** 実ブラウザ（`pnpm dev` と `/opt/pw-browsers` の Chromium）で、375px 幅の横向き・国家・体制などで前2500 年あたりを開き、エジプト古王国の名前と期間が左端に出ることを確かめる。縦向きでも見出しの下に出ることを確かめる
- [ ] **Step 6: Commit**

```bash
git add src/timeline/Timeline.tsx
git commit -m "Keep the names of long bars visible while scrolling"
```

---

### Task 3: 「次の駅」の案内

**Files:**
- Modify: `src/timeline/Timeline.tsx`, `src/app/icons.tsx`, `src/app/copy.ts`, `DESIGN.md`

**Interfaces:**
- Consumes: Task 1 の `visibleRange`・`nearbyBars`・`Nearby`・`centerScroll`・`BarLayout.reach`

- [ ] **Step 1:** `src/app/copy.ts` に足す（spec §5）:

```ts
  // 「次の駅」の案内の読み上げ。棒の名前の後ろに付ける
  cueSuffix: "へ移動",
```

- [ ] **Step 2:** `src/app/icons.tsx` に足す:

```tsx
// 「次の駅」の案内の向きを示すシェブロン（文字の矢印は OS やフォントで見え方が変わるため）
const CHEVRON_PATHS = {
  left: "M10 3 5 8l5 5",
  right: "M6 3l5 5-5 5",
  up: "M3 10l5-5 5 5",
  down: "M3 6l5 5 5-5",
} as const;

export function ChevronIcon({ direction }: { direction: keyof typeof CHEVRON_PATHS }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3 shrink-0 text-muted"
    >
      <path d={CHEVRON_PATHS[direction]} />
    </svg>
  );
}
```

- [ ] **Step 3:** `Timeline.tsx` で案内を計算する。状態は「どの配置（`lanes`）に対する案内か」と行ごとの `Nearby | null`、縦向きの下の案内を持ち上げる長さ（シートに隠れた分）を持つ。計算した結果の棒の id が前回と同じなら状態を変えない:

```tsx
type Cues = { lanes: LaneEntry[] | null; rows: (Nearby | null)[]; bottomInset: number };

const [cues, setCues] = useState<Cues>({ lanes: null, rows: [], bottomInset: 0 });
const cueKeyRef = useRef("");

const updateCues = useCallback(() => {
  const scroller = scrollerRef.current;
  if (!scroller || !lanes) return;
  const range =
    orientation === "vertical"
      ? visibleRange(scroller.scrollTop, scroller.clientHeight, visibleRatio, HEADER_HEIGHT)
      : visibleRange(scroller.scrollLeft, scroller.clientWidth, 1, 0);
  const rows = lanes.map(({ layout }) => nearbyBars(layout.bars, range));
  const bottomInset = Math.round(scroller.clientHeight * (1 - visibleRatio));
  const key = `${rows
    .map((row) => (row ? `${row.before?.span.id ?? ""}>${row.after?.span.id ?? ""}` : "-"))
    .join("|")}#${bottomInset}`;
  setCues((previous) => {
    if (previous.lanes === lanes && cueKeyRef.current === key) return previous;
    cueKeyRef.current = key;
    return { lanes, rows, bottomInset };
  });
}, [lanes, orientation, visibleRatio]);
```

中央の年を合わせる `useLayoutEffect` の後に、配置や見えている割合が変わったときと、年表の大きさが変わったときに計算し直す:

```tsx
useLayoutEffect(() => {
  updateCues();
  const scroller = scrollerRef.current;
  if (!scroller) return;
  const observer = new ResizeObserver(updateCues);
  observer.observe(scroller);
  return () => observer.disconnect();
}, [updateCues]);
```

`handleScroll` の最後で `updateCues()` を呼ぶ。描画には `cues.lanes === lanes ? cues.rows : []` を渡す（切り替えた直後に古い配置の案内を出さない）。

- [ ] **Step 4:** タップしたときのスクロール:

```tsx
// 案内の棒の端（position）を、見えている範囲の中ほどまで滑らかにスクロールする（spec §4）
function jumpTo(position: number) {
  const scroller = scrollerRef.current;
  if (!scroller) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (orientation === "vertical") {
    const { start, end } = visibleRange(0, scroller.clientHeight, visibleRatio, HEADER_HEIGHT);
    scroller.scrollTo({
      top: centerScroll(position, end - start, scroller.scrollHeight - scroller.clientHeight),
      behavior,
    });
  } else {
    scroller.scrollTo({
      left: centerScroll(position, scroller.clientWidth, scroller.scrollWidth - scroller.clientWidth),
      behavior,
    });
  }
}
```

- [ ] **Step 5:** 案内の部品。後ろの案内は棒の始まり（`offset`）へ、前の案内は棒の終わり（`offset + length`）へ飛ぶ。Tab の順には入れない:

```tsx
type CueSide = "before" | "after";

function Cue({
  bar,
  side,
  orientation,
  className,
  style,
  onJump,
}: {
  bar: BarLayout;
  side: CueSide;
  orientation: Orientation;
  className: string;
  style: CSSProperties;
  onJump: (position: number) => void;
}) {
  const direction =
    orientation === "horizontal"
      ? side === "before" ? "left" : "right"
      : side === "before" ? "up" : "down";
  const icon = <ChevronIcon direction={direction} />;
  const trailing = orientation === "horizontal" && side === "after";
  return (
    // 着くと案内が消え、フォーカスの行き場がなくなるので、Tab の順に入れない
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${bar.span.name}${COPY.cueSuffix}`}
      onClick={() => onJump(side === "after" ? bar.offset : bar.offset + bar.length)}
      className={`pointer-events-auto sticky flex max-w-full cursor-pointer items-center ${className}`}
      style={{ height: BAR_THICKNESS, ...style }}
    >
      <span className="flex min-w-0 items-center gap-xs rounded-sm border border-border bg-surface px-sm font-caption text-caption text-on-surface">
        {!trailing && icon}
        <span className="truncate" style={textStyle}>
          {bar.span.name}
        </span>
        {trailing && icon}
      </span>
    </button>
  );
}
```

- [ ] **Step 6:** 横向きの各行の `section` の最後に足す（行の 1 段目の高さに、年表の幅いっぱいの層を置く）:

```tsx
{cue && (
  <div
    className="pointer-events-none absolute left-0 z-10 flex"
    style={{ top: LANE_NAME_HEIGHT, width: length }}
  >
    {cue.before && (
      <Cue bar={cue.before} side="before" orientation="horizontal" className="left-xs" style={{}} onJump={onJump} />
    )}
    {cue.after && (
      <Cue bar={cue.after} side="after" orientation="horizontal" className="right-xs ml-auto" style={{}} onJump={onJump} />
    )}
  </div>
)}
```

縦向きの各列の `section` の最後に足す（列いっぱいの層。上の案内は見出しの下、下の案内はシートの上端に貼る）:

```tsx
{cue && (
  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col px-xs">
    {cue.before && (
      <Cue bar={cue.before} side="before" orientation="vertical" className="" style={{ top: HEADER_HEIGHT }} onJump={onJump} />
    )}
    {cue.after && (
      <Cue bar={cue.after} side="after" orientation="vertical" className="mt-auto" style={{ bottom: bottomInset }} onJump={onJump} />
    )}
  </div>
)}
```

`Horizontal`・`Vertical` に `cues: (Nearby | null)[]`、`onJump: (position: number) => void` を、`Vertical` には `bottomInset: number` も渡し、`lanes.map(({ lane, layout }, index) => …)` で `const cue = cues[index] ?? null;` を取る。

- [ ] **Step 7:** `DESIGN.md` を更新する
  - front matter の `components` に足す:

```yaml
  offscreen-cue:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
```

  - Colors の `muted` に「『次の駅』の案内のシェブロン」、`border` に「『次の駅』の案内の枠」を足す
  - Layout に「長い棒の中の名前と期間は、棒が画面にかかっているあいだ年表の端（横向きは左端、縦向きは行の見出しの下）に貼り付ける」「見えている範囲に棒が 1 つもない行には、前後のいちばん近い棒の名前を、行の端に『次の駅』の案内として貼り付ける。タップすると、その棒の端を見えている範囲の中ほどまでスクロールする」を足す
  - Components に「`offscreen-cue`: 見えている範囲が空の行に出す『次の駅』の案内（シェブロンと棒の名前）」を足す
  - `pnpm tokens` を実行し、`git diff --exit-code src/app/theme.css` で差分がないことを確かめる（部品はトークンを増やさない）。`pnpm exec design.md lint DESIGN.md` が通ることを確かめる

- [ ] **Step 8:** `pnpm exec biome ci . && pnpm typecheck && pnpm test && pnpm build` が通るのを確かめる
- [ ] **Step 9: 実ブラウザで確かめる**

`pnpm dev` で開き、headless Chromium（`/opt/pw-browsers/chromium`）で、PC 幅（1280px）と 375px 幅のそれぞれについて、主題 4 つ（国家・体制など／君主／首相・大統領など／政権）× 向き 2 通りのスクリーンショットを撮って見る。確かめること:

- 前2500 年あたりで、メソポタミアに「アッカド王国」とシェブロンの案内が出て、タップするとアッカド王国の始まりが見えている範囲の中ほどに来て、案内が消える
- 案内が行の名前・棒・年の目盛りに重ならない
- 棒が見えている行と、棒が 1 本もない行には案内が出ない
- 向き・主題を切り替えた直後に、古い案内が残らない
- 375px 幅の縦向きで出典シートを開くと、下の案内がシートの上端に出る

- [ ] **Step 10: Commit**

```bash
git add src DESIGN.md
git commit -m "Show cues to the nearest bars in empty lanes"
```

---

### Task 4: PR を作る

- [ ] **Step 1:** `git push -u origin claude/yoroshiku-onegaishimasu-r2wpv7`
- [ ] **Step 2:** PR を作る（日本語。本文に、足した理由と動き、デザインのモックの URL、実ブラウザで確かめた要点を書く）。CI が通ってからマージする
