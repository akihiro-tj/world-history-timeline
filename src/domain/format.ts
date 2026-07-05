export function formatYear(year: number): string {
  return year < 0 ? `前${-year}年` : `${year}年`
}

export function formatSpan(start: number, end?: number): string {
  return end === undefined ? formatYear(start) : `${formatYear(start)}〜${formatYear(end)}`
}
