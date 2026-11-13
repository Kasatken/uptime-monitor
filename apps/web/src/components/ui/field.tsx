import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../../lib/cn';

export const inputClass = cn(
  'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg shadow-card',
  'placeholder:text-fg-subtle transition-colors',
  'focus:border-accent focus:outline-none focus:ring-3 focus:ring-ring',
  'aria-invalid:border-down aria-invalid:focus:ring-down/25',
  'disabled:opacity-60',
);

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => ReactNode;
}

/** Label + control + hint/error, with ids wired up for screen readers. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-fg">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-down' : 'text-fg-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, 'appearance-auto pr-2', className)} {...props} />;
}
