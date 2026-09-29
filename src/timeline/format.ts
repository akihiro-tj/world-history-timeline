// 年の表示形式（spec §6）
import { COPY } from "../app/copy";
import type { Year } from "../data/timeline";

export function formatYear({ year, circa }: Year): string {
  const text = year < 0 ? `前${-year}` : String(year);
  return circa ? `${text}頃` : text;
}

// 終わりが null なら現在まで。開始と終了が同じ年なら 1 つだけ出す
export function formatPeriod(start: Year, end: Year | null): string {
  if (end === null) return `${formatYear(start)}–${COPY.present}`;
  if (start.year === end.year && start.circa === end.circa) return formatYear(start);
  return `${formatYear(start)}–${formatYear(end)}`;
}
