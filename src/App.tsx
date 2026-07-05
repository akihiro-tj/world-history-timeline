import { ErrorBoundary } from './components/ErrorBoundary'
import { TimelinePage } from './components/TimelinePage'
import { useTimelineData } from './hooks/useTimelineData'

function TimelineRoot() {
  const { status, dataset, reload } = useTimelineData()
  if (status === 'loading') {
    return <div className="grid h-dvh place-items-center text-muted">読み込み中…</div>
  }
  if (dataset === undefined) {
    return (
      <div className="grid h-dvh place-items-center">
        <div className="text-center">
          <p className="mb-4">データの読み込みに失敗しました</p>
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-white"
            onClick={reload}
          >
            再試行
          </button>
        </div>
      </div>
    )
  }
  return <TimelinePage dataset={dataset} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <TimelineRoot />
    </ErrorBoundary>
  )
}
