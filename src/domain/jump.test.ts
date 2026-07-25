import { describe, expect, test } from 'vitest'
import {
  centerHorizontalScroll,
  centerVerticalScroll,
  revealHorizontalScroll,
  revealVerticalScroll,
} from './jump'

describe('centerHorizontalScroll', () => {
  test('列がない場合はスクロールしない', () => {
    expect(centerHorizontalScroll(undefined, 64, 600)).toBeNull()
  })

  test('列の中心をビューポート中央に合わせる', () => {
    const column = { left: 1000, width: 88 }
    expect(centerHorizontalScroll(column, 64, 600)).toBe(1000 + 44 - 64 - 300)
  })

  test('負の値は0にクランプする', () => {
    const column = { left: 200, width: 88 }
    expect(centerHorizontalScroll(column, 64, 600)).toBe(0)
  })
})

describe('centerVerticalScroll', () => {
  test('開始年をビューポート中央に合わせる', () => {
    expect(centerVerticalScroll(1500, -800, 2, 800)).toBe((1500 - -800) * 2 - 400)
  })

  test('負の値は0にクランプする', () => {
    expect(centerVerticalScroll(-800, -800, 2, 800)).toBe(0)
  })
})

describe('revealHorizontalScroll', () => {
  const axisWidth = 64
  const viewportWidth = 600
  const marginPx = 16

  test('列がない場合はスクロールしない', () => {
    expect(revealHorizontalScroll(undefined, axisWidth, viewportWidth, 0, marginPx)).toBeNull()
  })

  test('可視領域内なら変更しない', () => {
    const column = { left: 300, width: 88 }
    expect(revealHorizontalScroll(column, axisWidth, viewportWidth, 0, marginPx)).toBeNull()
  })

  test('左に隠れていれば左端に合わせてスクロールする', () => {
    const column = { left: 500, width: 88 }
    expect(revealHorizontalScroll(column, axisWidth, viewportWidth, 600, marginPx)).toBe(
      500 - axisWidth - marginPx,
    )
  })

  test('右に隠れていれば右端に合わせてスクロールする', () => {
    const column = { left: 700, width: 88 }
    expect(revealHorizontalScroll(column, axisWidth, viewportWidth, 0, marginPx)).toBe(
      700 + 88 - axisWidth - viewportWidth + marginPx,
    )
  })
})

describe('revealVerticalScroll', () => {
  const pxPerYear = 2
  const minYear = -800
  const viewportHeight = 800
  const marginPx = 16

  test('可視領域内なら変更しない', () => {
    expect(
      revealVerticalScroll(1500, minYear, pxPerYear, 4000, viewportHeight, marginPx),
    ).toBeNull()
  })

  test('上に隠れていれば上端に合わせてスクロールする', () => {
    expect(revealVerticalScroll(1000, minYear, pxPerYear, 4000, viewportHeight, marginPx)).toBe(
      (1000 - minYear) * pxPerYear - marginPx,
    )
  })

  test('下に隠れていれば下端に合わせてスクロールする', () => {
    expect(revealVerticalScroll(2000, minYear, pxPerYear, 1000, viewportHeight, marginPx)).toBe(
      (2000 - minYear) * pxPerYear - viewportHeight + marginPx,
    )
  })

  test('負の値は0にクランプする', () => {
    expect(revealVerticalScroll(-800, minYear, pxPerYear, 4000, viewportHeight, marginPx)).toBe(0)
  })
})
