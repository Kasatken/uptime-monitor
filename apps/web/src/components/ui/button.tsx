import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

const variants = {
  primary: 'bg-ink text-ink-fg hover:opacity-90',
  secondary: 'bg-surface text-fg ring-1 ring-inset ring-line hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  night: 'bg-night text-white hover:opacity-90',
  danger: 'bg-tomato text-on-color hover:brightness-95',
  onColor: 'bg-white/55 text-on-color hover:bg-white/80',
} as const;

const sizes = {
  sm: 'h-9 gap-1.5 px-4 text-[13px]',
  md: 'h-11 gap-2 px-5 text-sm',
  icon: 'size-11 justify-center',
  iconSm: 'size-9 justify-center',
} as const;

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full font-semibold whitespace-nowrap transition',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ArrowBadge({
  onColor = false,
  className,
}: {
  onColor?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full transition-transform group-hover:-rotate-12',
        onColor ? 'bg-night text-white' : 'bg-ink text-ink-fg',
        className,
      )}
    >
      <ArrowUpRight className="size-5" />
    </span>
  );
}
