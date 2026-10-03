// 選んだ項目の持ち方。URL には持たせず、アプリの中の状態にする（spec §4）
import type { Row, Span, View } from "../timeline/spans";

// 選んだ項目。laneId は行の国・地域、key は王朝なら "dynasty:<id>"、在位なら "reign:<役割>/<人物の id>/<表示名>"
// （再登板の spec のまとまり。同じ行の、同じ人物・同じ表示名の在位）
export type Selection = { laneId: string; key: string };

// 王朝の棒は group が null、在位の棒は group が "<役割>/<人物の id>/<表示名>"（spans.ts）
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
export function keepSelection(
  selection: Selection | null,
  view: View,
  rows: Row[],
): Selection | null {
  if (selection === null) return null;
  const found = rows.some((row) =>
    row.spans.some((span) => isSelected(selection, laneIdOf(view, row), span)),
  );
  return found ? selection : null;
}
