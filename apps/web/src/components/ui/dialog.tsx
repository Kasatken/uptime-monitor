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

/**
 * Native <dialog>: focus trap, Esc to close, inert background and top-layer
 * stacking come from the browser, not from a library.
 */
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
          ? 'sheet ml-auto h-dvh max-h-dvh w-full max-w-lg'
          : 'm-auto w-[calc(100%-2rem)] max-w-md',
      )}
    >
      {open && (
        <div
          className={cn(
            'flex flex-col border-line bg-surface shadow-2xl',
            variant === 'sheet' ? 'h-full border-l' : 'rounded-xl border',
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 -mt-1"
              onClick={onClose}
              aria-label="Close"
            >
              <X />
            </Button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
