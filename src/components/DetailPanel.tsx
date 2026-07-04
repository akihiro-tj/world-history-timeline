import type { Dataset, Entry } from '../data/schema'
import { findContemporaries } from '../domain/contemporaries'
import { formatSpan, formatYear } from '../domain/format'

const TYPE_LABEL: Record<Entry['type'], string> = {
  ruler: '統治者',
  person: '人物',
  event: '事件',
}

type Props = {
  entry: Entry
  dataset: Dataset
  onSelect: (id: string) => void
  onClose: () => void
}

export function DetailPanel({ entry, dataset, onSelect, onClose }: Props) {
  const contemporaries = findContemporaries(entry, dataset.entries, dataset.regions)
  const regionName = (id: string) => dataset.regions.find((r) => r.id === id)?.name ?? id
  const meta = [TYPE_LABEL[entry.type], entry.groupName, formatSpan(entry.start, entry.end)]
    .filter(Boolean)
    .join(' ・ ')

  return (
    <aside
      aria-label="詳細"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[50dvh] overflow-y-auto rounded-t-xl border border-line bg-panel p-4 shadow-lg md:inset-x-auto md:top-0 md:right-0 md:h-dvh md:max-h-none md:w-80 md:rounded-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{entry.title}</h2>
        <button
          type="button"
          aria-label="閉じる"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{meta}</p>
      <p className="mt-3 text-sm leading-relaxed">{entry.description}</p>
      {contemporaries.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-medium text-muted">同時代</h3>
          <ul aria-label="同時代" className="mt-1">
            {contemporaries.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                  onClick={() => onSelect(c.id)}
                >
                  {c.title}
                  <span className="ml-1 text-xs text-muted">
                    （{regionName(c.region)} ・ {formatYear(c.start)}〜）
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
