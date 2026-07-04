import type { Dataset } from '../data/schema'

export function TimelinePage({ dataset }: { dataset: Dataset }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">世界史タイムライン</h1>
      <p className="text-muted">
        {dataset.regions.length} 地域 / {dataset.entries.length} エントリ
      </p>
    </div>
  )
}
