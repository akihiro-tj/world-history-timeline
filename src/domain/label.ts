const FULL_WIDTH_EM = 1
const HALF_WIDTH_EM = 0.55
const ELLIPSIS = '…'
const LAST_HALF_WIDTH_CODE_POINT = 0xff

function charWidthEm(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0
  return codePoint <= LAST_HALF_WIDTH_CODE_POINT ? HALF_WIDTH_EM : FULL_WIDTH_EM
}

export function textWidthPx(text: string, fontSizePx: number): number {
  let widthEm = 0
  for (const char of text) widthEm += charWidthEm(char)
  return widthEm * fontSizePx
}

export function truncateLabel(text: string, maxWidthPx: number, fontSizePx: number): string {
  if (textWidthPx(text, fontSizePx) <= maxWidthPx) return text
  const budget = maxWidthPx - FULL_WIDTH_EM * fontSizePx
  let truncated = ''
  let used = 0
  for (const char of text) {
    const charWidth = charWidthEm(char) * fontSizePx
    if (used + charWidth > budget) break
    truncated += char
    used += charWidth
  }
  return truncated + ELLIPSIS
}
