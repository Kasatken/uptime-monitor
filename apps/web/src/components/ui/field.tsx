import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../../lib/cn';

export const inputClass = cn(
  'h-12 w-full rounded-2xl border border-transparent bg-surface-muted px-4 text-[15px] text-fg',
  'placeholder:text-fg-subtle transition-colors outline-none',
  'focus:border-fg focus:bg-surface',
  'aria-invalid:border-down disabled:opacity-60',
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

export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-fg">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={cn('text-xs', error ? 'font-medium text-down' : 'text-fg-muted')}
        >
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
  return <select className={cn(inputClass, 'appearance-auto pr-3', className)} {...props} />;
}
