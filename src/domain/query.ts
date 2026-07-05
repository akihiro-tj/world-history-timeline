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

const KATAKANA_TO_HIRAGANA_OFFSET = 0x60

export function toHiragana(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - KATAKANA_TO_HIRAGANA_OFFSET),
    )
    .replace(/ゔぁ/g, 'ば')
    .replace(/ゔぃ/g, 'び')
    .replace(/ゔぇ/g, 'べ')
    .replace(/ゔぉ/g, 'ぼ')
    .replace(/ゔ/g, 'ぶ')
}

export function searchEntries(entries: Entry[], text: string, limit = 8): Entry[] {
  const normalizedQuery = toHiragana(text)
  return entries
    .filter(
      (e) =>
        toHiragana(e.title).includes(normalizedQuery) ||
        toHiragana(e.reading).includes(normalizedQuery),
    )
    .sort((a, b) => a.importance - b.importance || a.start - b.start)
    .slice(0, limit)
}
