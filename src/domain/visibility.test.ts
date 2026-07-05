import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { maxVisibleImportance, visibleEntries } from './visibility'

describe('maxVisibleImportance', () => {
  test('引きでは importance 1 のみ', () => {
    expect(maxVisibleImportance(0.3)).toBe(1)
  })

  test('中間ズームでは importance 2 まで', () => {
    expect(maxVisibleImportance(2)).toBe(2)
  })

  test('寄りでは importance 3 まで', () => {
    expect(maxVisibleImportance(8)).toBe(3)
  })
})

describe('visibleEntries', () => {
  const entries = [
    makeEntry({ id: 'in-range', start: 1200, end: 1250, importance: 1 }),
    makeEntry({ id: 'overlapping-top', start: 1050, end: 1120, importance: 1 }),
    makeEntry({ id: 'before-range', start: 800, end: 900, importance: 1 }),
    makeEntry({ id: 'too-detailed', start: 1200, end: 1250, importance: 3 }),
    makeEntry({ id: 'point-in-range', type: 'event', start: 1210, end: undefined, importance: 1 }),
  ]

  test('範囲と交差し importance 条件を満たすものだけ返す', () => {
    const visible = visibleEntries(entries, 1100, 1300, 2).map((e) => e.id)
    expect(visible).toEqual(['in-range', 'overlapping-top', 'point-in-range'])
  })

  test('maxImportance を上げると詳細エントリも含む', () => {
    const visible = visibleEntries(entries, 1100, 1300, 3).map((e) => e.id)
    expect(visible).toContain('too-detailed')
  })
})
