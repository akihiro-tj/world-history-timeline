import type { Entry } from '../data/schema'
import { SearchBar } from './SearchBar'

type Props = {
  entries: Entry[]
  onJumpToYear: (year: number) => void
  onSelectEntry: (id: string) => void
  onOpenHelp: () => void
}

export function TopBar({ entries, onJumpToYear, onSelectEntry, onOpenHelp }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-panel px-3">
      <h1 className="shrink-0 text-sm font-semibold max-sm:hidden">世界史タイムライン</h1>
      <div className="mx-auto w-full max-w-72">
        <SearchBar entries={entries} onJumpToYear={onJumpToYear} onSelectEntry={onSelectEntry} />
      </div>
      <button
        type="button"
        aria-label="つかいかた"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sm text-muted"
        onClick={onOpenHelp}
      >
        ?
      </button>
    </header>
  )
}
