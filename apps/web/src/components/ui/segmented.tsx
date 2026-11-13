import { cn } from '../../lib/cn';

interface SegmentedProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'dark';
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  tone = 'default',
}: SegmentedProps<T>) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex cursor-pointer items-center gap-1.5 rounded-full font-semibold transition select-none',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-fg',
              size === 'sm' ? 'h-8 px-3.5 text-xs' : 'h-10 px-4 text-sm',
              tone === 'dark'
                ? checked
                  ? 'bg-lime text-on-color'
                  : 'text-white/60 ring-1 ring-white/15 ring-inset hover:text-white'
                : checked
                  ? 'bg-ink text-ink-fg'
                  : 'bg-surface text-fg ring-1 ring-line ring-inset hover:ring-line-strong',
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
              <span className={cn('tabular', checked ? 'opacity-70' : 'text-fg-subtle')}>
                {option.count}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
