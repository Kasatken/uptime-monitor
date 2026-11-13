import { cn } from '../lib/cn';

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
        <rect width="32" height="32" rx="10" fill="#161616" />
        <path
          d="M6 17h5l3-8 4 14 3-6h5"
          fill="none"
          stroke="#cbef5b"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && <span className="font-display text-lg font-semibold tracking-tight">Vigil</span>}
    </span>
  );
}
