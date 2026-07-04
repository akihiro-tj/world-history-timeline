import { expect, test } from 'vitest'
import { formatSpan, formatYear } from './format'

test('西暦年を「1300年」形式にする', () => {
  expect(formatYear(1300)).toBe('1300年')
})

test('負数を「前300年」形式にする', () => {
  expect(formatYear(-300)).toBe('前300年')
})

test('期間を「〜」で結合する', () => {
  expect(formatSpan(1272, 1307)).toBe('1272年〜1307年')
})

test('end がなければ単年表示', () => {
  expect(formatSpan(1303)).toBe('1303年')
})

test('紀元前をまたぐ期間', () => {
  expect(formatSpan(-27, 14)).toBe('前27年〜14年')
})
