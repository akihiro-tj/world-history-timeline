import { describe, expect, test } from 'vitest'
import { computeEdgeFades } from './edgeFades'

describe('computeEdgeFades', () => {
  const base = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 2000,
    scrollWidth: 1500,
    clientHeight: 800,
    clientWidth: 600,
  }

  test('先頭位置では下と右だけフェードを出す', () => {
    expect(computeEdgeFades(base)).toEqual({ top: false, bottom: true, left: false, right: true })
  })

  test('末尾位置では上と左だけフェードを出す', () => {
    expect(computeEdgeFades({ ...base, scrollTop: 1200, scrollLeft: 900 })).toEqual({
      top: true,
      bottom: false,
      left: true,
      right: false,
    })
  })

  test('スクロール余地が無い軸はフェードを出さない', () => {
    expect(computeEdgeFades({ ...base, scrollHeight: 800, scrollWidth: 600 })).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    })
  })
})
