import { useEffect } from 'react'

const GUIDE_ITEMS = [
  { icon: '↕', text: 'スクロールで時代を移動' },
  { icon: '＋−', text: 'ズームするほど詳しい人物・事件が現れる（ピンチ対応）' },
  { icon: '▭', text: 'バーや ◆ をクリックすると解説と同時代の出来事を表示' },
  { icon: '🔍', text: '名前や年号を入力してジャンプ' },
] as const

type Props = {
  onClose: () => void
}

export function WelcomeOverlay({ onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape キーで同等の操作を提供している
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape キーで同等の操作を提供している */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label="つかいかた"
        className="w-full max-w-sm rounded-md bg-panel p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">つかいかた</h2>
        <ul className="mt-4 space-y-3">
          {GUIDE_ITEMS.map((item) => (
            <li key={item.text} className="flex items-start gap-3 text-sm leading-relaxed">
              <span className="w-10 shrink-0 text-center text-muted">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-5 w-full rounded-md border border-line bg-panel py-2 text-sm font-medium"
          onClick={onClose}
        >
          はじめる
        </button>
        <p className="mt-2 text-center text-xs text-muted">右上の ? からいつでも見返せます</p>
      </section>
    </div>
  )
}
