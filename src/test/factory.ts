import type { Entry } from '../data/schema'

type EntryOverrides = Partial<Omit<Entry, 'type' | 'end'>> & {
  id: string
  type?: Entry['type']
  end?: number
}

export function makeEntry(over: EntryOverrides): Entry {
  const type = over.type ?? 'ruler'
  const common = {
    id: over.id,
    region: over.region ?? 'west-europe',
    group: over.group,
    groupName: over.groupName,
    title: over.title ?? over.id,
    reading: over.reading ?? 'てすとよみ',
    start: over.start ?? 1000,
    importance: over.importance ?? 1,
    description: over.description ?? 'テスト用エントリ。',
  }
  // Why: ruler/person require end at the type level, event doesn't; only event
  // may fall through to an undefined end (point-in-time), so the default
  // (1050) applies to every other case.
  return type === 'event'
    ? { ...common, type, end: over.end }
    : { ...common, type, end: over.end ?? 1050 }
}
