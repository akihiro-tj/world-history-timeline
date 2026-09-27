// 年の表示形式（spec §6）
import type { Year } from "../data/timeline";

export function formatYear({ year, circa }: Year): string {
  const text = year < 0 ? `前${-year}` : String(year);
  return circa ? `${text}頃` : text;
}

export function formatPeriod(start: Year, end: Year): string {
  return `${formatYear(start)}–${formatYear(end)}`;
}
