import { describe, expect, test } from 'vitest'
import { clampPxPerYear, maxPxPerYear, minPxPerYear, wheelZoomFactor, zoomAt } from './zoom'

describe('clampPxPerYear', () => {
  test('下限は全時代が2.5画面に収まるスケール', () => {
    expect(minPxPerYear(5100, 800)).toBeCloseTo((800 * 2.5) / 5100)
    expect(clampPxPerYear(0.001, 5100, 800)).toBeCloseTo(minPxPerYear(5100, 800))
  })

  test('上限は1世紀が1画面のスケール', () => {
    expect(maxPxPerYear(800)).toBe(8)
    expect(clampPxPerYear(100, 5100, 800)).toBe(8)
  })

  test('範囲内はそのまま', () => {
    expect(clampPxPerYear(2, 5100, 800)).toBe(2)
  })

  test('小さい viewport でも importance 3 のしきい値(4px/年)に届く上限を保証する', () => {
    expect(maxPxPerYear(300)).toBe(5)
    expect(maxPxPerYear(400)).toBe(5)
    expect(maxPxPerYear(800)).toBe(8)
  })
})

describe('wheelZoomFactor', () => {
  test('deltaY 0 では1倍', () => {
    expect(wheelZoomFactor(0)).toBe(1)
  })

  test('小さいピンチは小さく、大きいピンチは大きくズームする', () => {
    expect(wheelZoomFactor(-10)).toBeCloseTo(Math.exp(0.08))
    expect(wheelZoomFactor(-10)).toBeLessThan(wheelZoomFactor(-20))
  })

  test('1イベントの係数を [0.8, 1.25] にクランプする', () => {
    expect(wheelZoomFactor(-1000)).toBe(1.25)
    expect(wheelZoomFactor(1000)).toBe(0.8)
  })
})

describe('zoomAt', () => {
  test('アンカー位置の年が画面上で動かない', () => {
    const state = { pxPerYear: 2, scrollTop: 1000 }
    const anchorOffset = 300
    const anchorYears = (state.scrollTop + anchorOffset) / state.pxPerYear
    const next = zoomAt(state, 1.5, anchorOffset, 5100, 800)
    expect(next.pxPerYear).toBe(3)
    expect((next.scrollTop + anchorOffset) / next.pxPerYear).toBeCloseTo(anchorYears)
  })

  test('クランプされてもスクロール補正は新スケール基準', () => {
    const next = zoomAt({ pxPerYear: 7, scrollTop: 1000 }, 10, 400, 5100, 800)
    expect(next.pxPerYear).toBe(8)
  })

  test('scrollTop は負にならない', () => {
    const next = zoomAt({ pxPerYear: 2, scrollTop: 0 }, 0.5, 0, 5100, 800)
    expect(next.scrollTop).toBeGreaterThanOrEqual(0)
  })
})
