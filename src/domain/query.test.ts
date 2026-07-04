import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { parseQuery, searchEntries } from './query'

describe('parseQuery', () => {
  test('空文字は empty', () => {
    expect(parseQuery('  ')).toEqual({ kind: 'empty' })
  })

  test('数字は西暦年', () => {
    expect(parseQuery('1300')).toEqual({ kind: 'year', year: 1300 })
  })

  test('「1300年」の形式も西暦年', () => {
    expect(parseQuery('1300年')).toEqual({ kind: 'year', year: 1300 })
  })

  test('「前300」は紀元前', () => {
    expect(parseQuery('前300')).toEqual({ kind: 'year', year: -300 })
  })

  test('それ以外は名前検索', () => {
    expect(parseQuery('エドワード')).toEqual({ kind: 'name', text: 'エドワード' })
  })
})

describe('searchEntries', () => {
  const entries = [
    makeEntry({ id: 'edward-1', title: 'エドワード1世', importance: 2, start: 1272 }),
    makeEntry({ id: 'edward-2', title: 'エドワード2世', importance: 3, start: 1307 }),
    makeEntry({ id: 'philippe-4', title: 'フィリップ4世', importance: 1, start: 1285 }),
  ]

  test('タイトル部分一致で絞り込む', () => {
    expect(searchEntries(entries, 'エドワード').map((e) => e.id)).toEqual(['edward-1', 'edward-2'])
  })

  test('importance 順・開始年順に並べる', () => {
    expect(searchEntries(entries, '世').map((e) => e.id)).toEqual([
      'philippe-4',
      'edward-1',
      'edward-2',
    ])
  })

  test('limit で件数を制限する', () => {
    expect(searchEntries(entries, '世', 1)).toHaveLength(1)
  })
})
