import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

const variants = {
  primary: 'bg-fg text-canvas hover:bg-fg/85 shadow-card',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-muted shadow-card',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-muted',
  danger: 'bg-down text-white hover:bg-down/90 shadow-card',
} as const;

const sizes = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'size-9 justify-center',
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
        'inline-flex shrink-0 items-center rounded-lg font-medium whitespace-nowrap transition-colors',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
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
