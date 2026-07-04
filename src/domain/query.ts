import type { Entry } from '../data/schema'

export type Query =
  | { kind: 'empty' }
  | { kind: 'year'; year: number }
  | { kind: 'name'; text: string }

export function parseQuery(input: string): Query {
  const text = input.trim()
  if (text === '') return { kind: 'empty' }
  const ad = text.match(/^(\d{1,4})年?$/)
  if (ad) return { kind: 'year', year: Number(ad[1]) }
  const bc = text.match(/^前(\d{1,4})年?$/)
  if (bc) return { kind: 'year', year: -Number(bc[1]) }
  return { kind: 'name', text }
}

export function searchEntries(entries: Entry[], text: string, limit = 8): Entry[] {
  return entries
    .filter((e) => e.title.includes(text))
    .sort((a, b) => a.importance - b.importance || a.start - b.start)
    .slice(0, limit)
}
