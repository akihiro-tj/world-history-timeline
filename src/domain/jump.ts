export type JumpColumn = {
  left: number
  width: number
}

export function centerHorizontalScroll(
  column: JumpColumn | undefined,
  axisWidth: number,
  viewportWidth: number,
): number | null {
  if (!column) return null
  const entryCenterX = column.left + column.width / 2
  return Math.max(0, entryCenterX - axisWidth - viewportWidth / 2)
}

export function centerVerticalScroll(
  startYear: number,
  minYear: number,
  pxPerYear: number,
  viewportHeight: number,
): number {
  return Math.max(0, (startYear - minYear) * pxPerYear - viewportHeight / 2)
}

export function revealHorizontalScroll(
  column: JumpColumn | undefined,
  axisWidth: number,
  viewportWidth: number,
  currentScrollLeft: number,
  marginPx: number,
): number | null {
  if (!column) return null
  const columnLeftX = column.left
  const columnRightX = columnLeftX + column.width
  const visibleLeft = currentScrollLeft + axisWidth
  const visibleRight = currentScrollLeft + axisWidth + viewportWidth
  if (columnLeftX < visibleLeft + marginPx) {
    return Math.max(0, columnLeftX - axisWidth - marginPx)
  }
  if (columnRightX > visibleRight - marginPx) {
    return Math.max(0, columnRightX - axisWidth - viewportWidth + marginPx)
  }
  return null
}

export function revealVerticalScroll(
  startYear: number,
  minYear: number,
  pxPerYear: number,
  currentScrollTop: number,
  viewportHeight: number,
  marginPx: number,
): number | null {
  const entryTopY = (startYear - minYear) * pxPerYear
  const visibleTop = currentScrollTop + marginPx
  const visibleBottom = currentScrollTop + viewportHeight - marginPx
  if (entryTopY < visibleTop) return Math.max(0, entryTopY - marginPx)
  if (entryTopY > visibleBottom) return Math.max(0, entryTopY - viewportHeight + marginPx)
  return null
}
