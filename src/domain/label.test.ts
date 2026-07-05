import { describe, expect, test } from 'vitest'
import { textWidthPx, truncateLabel } from './label'

describe('textWidthPx', () => {
  test('全角は1em、半角は0.55emで近似する', () => {
    expect(textWidthPx('あい', 10)).toBe(20)
    expect(textWidthPx('ab', 10)).toBe(11)
    expect(textWidthPx('あa', 10)).toBe(15.5)
  })
})

describe('truncateLabel', () => {
  test('収まるテキストはそのまま返す', () => {
    expect(truncateLabel('カエサル', 44, 11)).toBe('カエサル')
  })

  test('はみ出すテキストは省略記号付きで切り詰める', () => {
    const result = truncateLabel('アレクサンドロス大王', 76, 11)
    expect(result.endsWith('…')).toBe(true)
    expect(textWidthPx(result, 11)).toBeLessThanOrEqual(76)
  })

  test('半角混在でも幅内に収める', () => {
    const result = truncateLabel('メフメト2世スルタン即位', 60, 11)
    expect(textWidthPx(result, 11)).toBeLessThanOrEqual(60)
  })

  test('極端に狭い幅では省略記号のみ返す', () => {
    expect(truncateLabel('カエサル', 10, 11)).toBe('…')
  })
})
