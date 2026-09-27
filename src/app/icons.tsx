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
