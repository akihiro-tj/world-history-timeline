// 主題の選択。主題は今後増えていくので、数によらず 1 段に収まるネイティブのセレクトにする
// （スマートフォンでは OS の選択画面が出る）
import { ChevronDownIcon } from "./icons";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SubjectSelect<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          if (next) onChange(next.value);
        }}
        className="min-h-(--spacing-tap) cursor-pointer appearance-none rounded-md border border-border bg-surface pr-(--spacing-tap) pl-md font-label text-label text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-md -translate-y-1/2 text-muted">
        <ChevronDownIcon />
      </span>
    </div>
  );
}
