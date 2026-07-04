type Props = {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitAll: () => void
}

const buttonClass =
  'grid h-10 w-10 place-items-center rounded-md border border-line bg-panel text-lg shadow-sm'

export function ZoomControls({ onZoomIn, onZoomOut, onFitAll }: Props) {
  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col gap-2">
      <button type="button" aria-label="拡大" className={buttonClass} onClick={onZoomIn}>
        ＋
      </button>
      <button type="button" aria-label="縮小" className={buttonClass} onClick={onZoomOut}>
        −
      </button>
      <button
        type="button"
        aria-label="全体表示"
        className={`${buttonClass} text-xs`}
        onClick={onFitAll}
      >
        全体
      </button>
    </div>
  )
}
