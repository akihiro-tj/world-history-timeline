import { expect, test } from 'vitest'
import { createScale } from './scale'

test('minYear が Y=0 になる', () => {
  const scale = createScale(-3000, 2100, 2)
  expect(scale.yearToY(-3000)).toBe(0)
})

test('年差 × pxPerYear が Y 座標になる', () => {
  const scale = createScale(-3000, 2100, 2)
  expect(scale.yearToY(1300)).toBe(4300 * 2)
})

test('totalHeight は全期間の高さ', () => {
  const scale = createScale(-3000, 2100, 0.5)
  expect(scale.totalHeight).toBe(5100 * 0.5)
})

test('yToYear は yearToY の逆変換', () => {
  const scale = createScale(-3000, 2100, 1.5)
  expect(scale.yToYear(scale.yearToY(476))).toBeCloseTo(476)
})
