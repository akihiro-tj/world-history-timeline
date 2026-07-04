import { useMemo, useState } from 'react'
import type { Entry } from '../data/schema'
import { formatSpan } from '../domain/format'
import { parseQuery, searchEntries } from '../domain/query'

type Props = {
  entries: Entry[]
  onJumpToYear: (year: number) => void
  onSelectEntry: (id: string) => void
}

export function SearchBar({ entries, onJumpToYear, onSelectEntry }: Props) {
  const [input, setInput] = useState('')
  const query = useMemo(() => parseQuery(input), [input])
  const candidates = useMemo(
    () => (query.kind === 'name' ? searchEntries(entries, query.text) : []),
    [entries, query],
  )

  return (
    <div className="fixed top-2 left-1/2 z-30 w-72 -translate-x-1/2">
      <input
        type="search"
        aria-label="検索"
        placeholder="名前か年（例: 1300 / 前300）"
        className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-sm"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.kind === 'year') {
            onJumpToYear(query.year)
            setInput('')
          }
        }}
      />
      {candidates.length > 0 && (
        <div
          role="listbox"
          aria-label="検索候補"
          className="mt-1 overflow-hidden rounded-md border border-line bg-panel shadow-lg"
        >
          {candidates.map((entry) => (
            <div key={entry.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface"
                onClick={() => {
                  onSelectEntry(entry.id)
                  setInput('')
                }}
              >
                {entry.title}
                <span className="ml-1 text-xs text-muted">
                  {formatSpan(entry.start, entry.end)}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
