import { cn } from '../lib/cn';

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-fg" />
        <path
          d="M6 17h5l3-8 4 14 3-6h5"
          fill="none"
          className="stroke-up"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && <span>Vigil</span>}
    </span>
  );
}
