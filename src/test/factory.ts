import type { Entry } from '../data/schema'

export function makeEntry(over: Partial<Entry> & { id: string }): Entry {
  return {
    type: 'ruler',
    region: 'west-europe',
    title: over.id,
    start: 1000,
    end: 1050,
    importance: 1,
    description: 'テスト用エントリ。',
    ...over,
  }
}
