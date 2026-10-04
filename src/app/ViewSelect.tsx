// 表示の選択。主題（国家・体制など／君主／首相・大統領など／政権）と国・地域を見出し付きの群に分けて、ひとつのネイティブのセレクトに収める。
// 主題や国・地域が増えても 1 段に収まる（スマートフォンでは OS の選択画面が出る）
import { ChevronDownIcon } from "./icons";

export type ViewGroup = { label: string; options: readonly { value: string; label: string }[] };

type Props = {
  label: string;
  groups: readonly ViewGroup[];
  value: string;
  onChange: (value: string) => void;
};

export function ViewSelect({ label, groups, value, onChange }: Props) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-tap cursor-pointer appearance-none rounded-md border border-border bg-surface pr-tap pl-md font-label text-label text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-md -translate-y-1/2 text-muted">
        <ChevronDownIcon />
      </span>
    </div>
  );
}
