import { describe, expect, test } from 'vitest'
import type { Entry } from '../data/schema'
import { endYear } from './entry'

const base = {
  id: 'test',
  region: 'west-europe',
  title: 'テスト',
  reading: 'てすと',
  importance: 1,
  description: 'テスト用。',
}

describe('endYear', () => {
  test('ruler は end を返す', () => {
    const entry: Entry = { ...base, type: 'ruler', start: 1272, end: 1307 }
    expect(endYear(entry)).toBe(1307)
  })

  test('person は end を返す', () => {
    const entry: Entry = { ...base, type: 'person', start: 1271, end: 1295 }
    expect(endYear(entry)).toBe(1295)
  })

  test('end のある event は end を返す', () => {
    const entry: Entry = { ...base, type: 'event', start: -264, end: -146 }
    expect(endYear(entry)).toBe(-146)
  })

  test('end のない event は start を返す', () => {
    const entry: Entry = { ...base, type: 'event', start: 1303 }
    expect(endYear(entry)).toBe(1303)
  })
})
