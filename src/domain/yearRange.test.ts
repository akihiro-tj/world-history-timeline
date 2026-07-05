import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { dataYearRange } from './yearRange'

describe('dataYearRange', () => {
  test('データ範囲を100年単位で外側に丸める', () => {
    const entries = [
      makeEntry({ id: 'a', start: -2987, end: -2950 }),
      makeEntry({ id: 'b', start: 1900, end: 1953 }),
    ]
    expect(dataYearRange(entries)).toEqual({ minYear: -3000, maxYear: 2000 })
  })

  test('ちょうど100年境界はそのまま使う', () => {
    const entries = [makeEntry({ id: 'a', start: -3000, end: 2000 })]
    expect(dataYearRange(entries)).toEqual({ minYear: -3000, maxYear: 2000 })
  })

  test('end のない点イベントは start を最大年の候補にする', () => {
    const entries = [
      makeEntry({ id: 'a', start: 1000, end: 1050 }),
      makeEntry({ id: 'b', type: 'event', start: 1953, end: undefined }),
    ]
    expect(dataYearRange(entries).maxYear).toBe(2000)
  })

  test('丸め後に幅が0なら最小幅100年を確保する', () => {
    const entries = [makeEntry({ id: 'a', type: 'event', start: 2000, end: undefined })]
    const range = dataYearRange(entries)
    expect(range.maxYear - range.minYear).toBe(100)
  })

  test('空配列でも幅が正の範囲を返す', () => {
    const range = dataYearRange([])
    expect(range.maxYear).toBeGreaterThan(range.minYear)
  })
})
