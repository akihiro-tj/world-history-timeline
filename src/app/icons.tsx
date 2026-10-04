// 向きの切り替えのアイコン。棒の並ぶ向きをそのまま描く（色は文字色を使う）
export function VerticalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5">
      <rect x="3" y="2" width="4" height="9" rx="1" />
      <rect x="3" y="12" width="4" height="6" rx="1" />
      <rect x="9" y="2" width="4" height="5" rx="1" />
      <rect x="9" y="8" width="4" height="10" rx="1" />
      <rect x="15" y="2" width="2" height="16" rx="1" opacity="0.35" />
    </svg>
  );
}

export function HorizontalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5">
      <rect x="2" y="3" width="9" height="4" rx="1" />
      <rect x="12" y="3" width="6" height="4" rx="1" />
      <rect x="2" y="9" width="5" height="4" rx="1" />
      <rect x="8" y="9" width="10" height="4" rx="1" />
      <rect x="2" y="15" width="16" height="2" rx="1" opacity="0.35" />
    </svg>
  );
}

// セレクトの右端に出す下向きの矢印
export function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

// 外部リンク（新しいタブで開く）の印。四角から右上に矢印が出る形
export function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="ml-xs inline size-3.5 align-[-2px]"
    >
      <path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5V13a.5.5 0 0 1-.5.5h-8.5A.5.5 0 0 1 2.5 13V4.5A.5.5 0 0 1 3 4H6.5" />
    </svg>
  );
}

// 出典パネルの閉じるボタンの ×
export function CloseIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="size-3.5"
    >
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

// 「次の駅」の案内の向きを示すシェブロン（文字の矢印は OS やフォントで見え方が変わるため）
const CHEVRON_PATHS = {
  left: "M10 3 5 8l5 5",
  right: "M6 3l5 5-5 5",
  up: "M3 10l5-5 5 5",
  down: "M3 6l5 5 5-5",
} as const;

export function ChevronIcon({ direction }: { direction: keyof typeof CHEVRON_PATHS }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-3 shrink-0 text-muted"
    >
      <path d={CHEVRON_PATHS[direction]} />
    </svg>
  );
}
