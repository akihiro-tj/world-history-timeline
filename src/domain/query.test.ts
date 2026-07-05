import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { parseQuery, searchEntries, toHiragana } from './query'

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

  test('「前300年」の年付き表記も紀元前として解釈する', () => {
    expect(parseQuery('前300年')).toEqual({ kind: 'year', year: -300 })
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

  test('limit を超える候補は importance・start 順の上位だけ返す', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ id: `same-${i}`, title: `同名${i}`, reading: 'どうめい', start: 1000 + i }),
    )
    const results = searchEntries(many, 'どうめい')
    expect(results.map((e) => e.id)).toEqual(Array.from({ length: 8 }, (_, i) => `same-${i}`))
  })
})

describe('toHiragana', () => {
  test('カタカナをひらがなに変換する', () => {
    expect(toHiragana('アレクサンドロス')).toBe('あれくさんどろす')
    expect(toHiragana('マルコ・ポーロ')).toBe('まるこ・ぽーろ')
  })

  test('ひらがな・漢字はそのまま', () => {
    expect(toHiragana('織田信長')).toBe('織田信長')
    expect(toHiragana('おだ')).toBe('おだ')
  })
})

describe('searchEntries (かな対応)', () => {
  const entries = [
    makeEntry({ id: 'alexander', title: 'アレクサンドロス', reading: 'あれくさんどろす' }),
    makeEntry({ id: 'nobunaga', title: '織田信長', reading: 'おだのぶなが' }),
  ]

  test('ひらがなでカタカナ名がヒットする', () => {
    expect(searchEntries(entries, 'あ').map((e) => e.id)).toContain('alexander')
  })

  test('ひらがなで漢字名が読みからヒットする', () => {
    expect(searchEntries(entries, 'おだ').map((e) => e.id)).toEqual(['nobunaga'])
  })

  test('漢字の部分一致も引き続きヒットする', () => {
    expect(searchEntries(entries, '織田').map((e) => e.id)).toEqual(['nobunaga'])
  })

  test('ゔ行はば行に正規化され、びくとりあ で ヴィクトリア が引ける', () => {
    const withVictoria = [
      makeEntry({ id: 'victoria', title: 'ヴィクトリア女王', reading: 'ゔぃくとりあじょおう' }),
    ]
    expect(searchEntries(withVictoria, 'びくとりあ').map((e) => e.id)).toEqual(['victoria'])
    expect(searchEntries(withVictoria, 'ヴィクトリア').map((e) => e.id)).toEqual(['victoria'])
  })
})
