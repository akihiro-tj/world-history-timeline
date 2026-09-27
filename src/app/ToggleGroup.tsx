// 表示の設定（向き）を選ぶ、アイコンのトグルボタンの並び。選んだ側に下線と薄い地を付ける。
// アイコンだけを出すので、名前は読み上げ（aria-label）とツールチップ（title）で示す
import type { ReactNode } from "react";

type Option<T extends string> = { value: T; label: string; icon: ReactNode };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ToggleGroup<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <fieldset
      aria-label={label}
      className="inline-flex overflow-hidden rounded-md border border-border"
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
          className={`inline-flex min-h-tap min-w-tap items-center justify-center px-sm text-muted ${index > 0 ? "border-l border-border" : ""} aria-pressed:bg-surface-subtle aria-pressed:text-primary aria-pressed:shadow-[inset_0_-2px_0_var(--color-primary)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
        >
          {option.icon}
        </button>
      ))}
    </fieldset>
  );
}
