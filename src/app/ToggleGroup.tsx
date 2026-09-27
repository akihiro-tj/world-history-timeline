// aria-pressed のトグルボタンを並べた切り替え
type Option<T extends string> = { value: T; label: string };

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
      className="inline-flex overflow-hidden rounded-md border border-border font-label text-label"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="px-md py-xs aria-pressed:bg-primary aria-pressed:text-on-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
