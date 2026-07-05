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
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isListDismissed, setIsListDismissed] = useState(false)
  const query = useMemo(() => parseQuery(input), [input])
  const candidates = useMemo(
    () => (query.kind === 'name' ? searchEntries(entries, query.text) : []),
    [entries, query],
  )
  const isListOpen = candidates.length > 0 && !isListDismissed

  const selectCandidate = (id: string) => {
    onSelectEntry(id)
    setInput('')
    setActiveIndex(-1)
  }

  return (
    <div className="relative w-full">
      <input
        type="search"
        aria-label="検索"
        placeholder="名前または年（例: 信長 / 1600）"
        aria-activedescendant={
          isListOpen && activeIndex >= 0 ? `search-option-${candidates[activeIndex].id}` : undefined
        }
        className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-sm"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setActiveIndex(-1)
          setIsListDismissed(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.kind === 'year') {
            onJumpToYear(query.year)
            setInput('')
            return
          }
          if (!isListOpen) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, candidates.length - 1))
            return
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, -1))
            return
          }
          if (e.key === 'Enter' && activeIndex >= 0) {
            selectCandidate(candidates[activeIndex].id)
            return
          }
          if (e.key === 'Escape') {
            setIsListDismissed(true)
            setActiveIndex(-1)
          }
        }}
      />
      {isListOpen && (
        <div
          role="listbox"
          aria-label="検索候補"
          className="absolute inset-x-0 top-full mt-1 overflow-hidden rounded-md border border-line bg-panel shadow-lg"
        >
          {candidates.map((entry, index) => (
            <div key={entry.id}>
              <button
                type="button"
                role="option"
                id={`search-option-${entry.id}`}
                aria-selected={index === activeIndex}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-surface ${
                  index === activeIndex ? 'bg-surface' : ''
                }`}
                onClick={() => selectCandidate(entry.id)}
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
