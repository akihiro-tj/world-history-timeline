// 年の表示形式（spec §6）
import { COPY } from "../app/copy";
import type { Year } from "../data/timeline";

export function formatYear({ year, circa }: Year): string {
  const text = year < 0 ? `前${-year}` : String(year);
  return circa ? `${text}頃` : text;
}

// 期間をいくつか並べるときは「、」で区切り、2 つずつ改行する（行の終わりにも「、」を付ける）
const PERIODS_PER_LINE = 2;

export function formatPeriodLines(periods: { start: Year; end: Year | null }[]): string[] {
  const texts = periods.map(({ start, end }) => formatPeriod(start, end));
  const lines: string[] = [];
  for (let i = 0; i < texts.length; i += PERIODS_PER_LINE) {
    const line = texts.slice(i, i + PERIODS_PER_LINE).join(COPY.periodSeparator);
    lines.push(i + PERIODS_PER_LINE < texts.length ? line + COPY.periodSeparator : line);
  }
  return lines;
}

// 終わりが null なら現在まで。開始と終了が同じ年なら 1 つだけ出す
export function formatPeriod(start: Year, end: Year | null): string {
  if (end === null) return `${formatYear(start)}–${COPY.present}`;
  if (start.year === end.year && start.circa === end.circa) return formatYear(start);
  return `${formatYear(start)}–${formatYear(end)}`;
}
