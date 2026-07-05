import { describe, expect, test } from 'vitest'
import type { Region } from '../data/schema'
import { makeEntry } from '../test/factory'
import { findContemporaries } from './contemporaries'

const regions: Region[] = [
  { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' },
  { id: 'east-asia', name: '東アジア', order: 6, color: '#3fa06b' },
  { id: 'japan', name: '日本', order: 7, color: '#d94a4a' },
]

const edward = makeEntry({ id: 'edward-1', region: 'west-europe', start: 1272, end: 1307 })

describe('findContemporaries', () => {
  test('期間が交差する他地域のエントリを地域順で返す', () => {
    const entries = [
      edward,
      makeEntry({ id: 'tokimune', region: 'japan', start: 1268, end: 1284 }),
      makeEntry({ id: 'kublai', region: 'east-asia', start: 1260, end: 1294 }),
    ]
    expect(findContemporaries(edward, entries, regions).map((e) => e.id)).toEqual([
      'kublai',
      'tokimune',
    ])
  })

  test('自分自身と同地域のエントリは除く', () => {
    const entries = [
      edward,
      makeEntry({ id: 'philippe-4', region: 'west-europe', start: 1285, end: 1314 }),
    ]
    expect(findContemporaries(edward, entries, regions)).toEqual([])
  })

  test('期間が交差しないエントリは除く', () => {
    const entries = [edward, makeEntry({ id: 'meiji', region: 'japan', start: 1868, end: 1912 })]
    expect(findContemporaries(edward, entries, regions)).toEqual([])
  })

  test('importance 3 は除く', () => {
    const entries = [
      edward,
      makeEntry({ id: 'minor', region: 'japan', start: 1272, end: 1307, importance: 3 }),
    ]
    expect(findContemporaries(edward, entries, regions)).toEqual([])
  })

  test('点イベントはその年で交差判定する', () => {
    const anagni = makeEntry({
      id: 'anagni',
      type: 'event',
      region: 'west-europe',
      start: 1303,
      end: undefined,
    })
    const entries = [
      anagni,
      makeEntry({ id: 'khalji', region: 'east-asia', start: 1296, end: 1316 }),
      makeEntry({ id: 'tokimune', region: 'japan', start: 1268, end: 1284 }),
    ]
    expect(findContemporaries(anagni, entries, regions).map((e) => e.id)).toEqual(['khalji'])
  })

  test('limit で件数を制限する', () => {
    const entries = [
      edward,
      ...Array.from({ length: 15 }, (_, i) =>
        makeEntry({
          id: `east-${String(i).padStart(2, '0')}`,
          region: 'east-asia',
          start: 1272,
          end: 1307,
        }),
      ),
    ]
    expect(findContemporaries(edward, entries, regions)).toHaveLength(10)
  })
})
