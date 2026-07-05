import { expect, test } from 'vitest'
import { generateTicks, tickInterval } from './ticks'

test('十分に寄っていれば10年間隔', () => {
  expect(tickInterval(8)).toBe(10)
})

test('中間ズームでは50年間隔', () => {
  expect(tickInterval(1.2)).toBe(50)
})

test('浅いズームでは100年間隔', () => {
  expect(tickInterval(0.6)).toBe(100)
})

test('引き切ると500年間隔', () => {
  expect(tickInterval(0.05)).toBe(500)
})

test('間隔の倍数だけを範囲内に生成する', () => {
  expect(generateTicks(-120, 260, 100)).toEqual([-100, 0, 100, 200])
})

test('境界の年も含む', () => {
  expect(generateTicks(1200, 1400, 100)).toEqual([1200, 1300, 1400])
})
