import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: 'sheet' | 'modal';
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  variant = 'modal',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a mouse shortcut; Esc is the native keyboard way to close
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      // a click on the dialog element itself means the backdrop, outside the panel
      onClick={(event) => event.target === ref.current && onClose()}
      className={cn(
        'bg-transparent p-0 text-fg backdrop:bg-transparent',
        variant === 'sheet'
          ? 'sheet ml-auto h-dvh max-h-dvh w-full max-w-xl p-0 sm:p-3'
          : 'm-auto w-[calc(100%-2rem)] max-w-md',
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col bg-surface shadow-2xl',
            variant === 'sheet' ? 'h-full sm:rounded-card' : 'rounded-card',
          )}
        >
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
            </div>
            <Button variant="secondary" size="iconSm" onClick={onClose} aria-label="Закрыть">
              <X />
            </Button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
