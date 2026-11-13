import { cn } from '../../lib/cn';

interface SegmentedProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
  size?: 'sm' | 'md';
}

/** Radio group styled as a pill switcher. Arrow keys work because it's real radios. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <fieldset className="inline-flex rounded-lg border border-line bg-surface-muted p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex cursor-pointer items-center gap-1.5 rounded-md font-medium transition-colors select-none',
              'has-focus-visible:outline-2 has-focus-visible:outline-accent',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              checked ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={label}
              checked={checked}
              onChange={() => onChange(option.value)}
            />
            {option.label}
            {option.count !== undefined && (
              <span className="tabular text-fg-subtle">{option.count}</span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
