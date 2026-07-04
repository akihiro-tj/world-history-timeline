export type Scale = {
  pxPerYear: number
  totalHeight: number
  yearToY: (year: number) => number
  yToYear: (y: number) => number
}

export function createScale(minYear: number, maxYear: number, pxPerYear: number): Scale {
  return {
    pxPerYear,
    totalHeight: (maxYear - minYear) * pxPerYear,
    yearToY: (year) => (year - minYear) * pxPerYear,
    yToYear: (y) => minYear + y / pxPerYear,
  }
}
