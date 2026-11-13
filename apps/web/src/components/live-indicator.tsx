import { cn } from '../lib/cn';
import { useLive } from '../live/live-provider';

const LABELS = { live: 'Онлайн', connecting: 'Подключение…', offline: 'Нет связи' } as const;

export function LiveIndicator({ className }: { className?: string }) {
  const { state } = useLive();
  return (
    <span
      role="status"
      title={
        state === 'live' ? 'Данные обновляются в реальном времени' : 'Пробуем переподключиться'
      }
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 max-sm:px-3 text-[13px] font-semibold text-fg shadow-card',
        className,
      )}
    >
      <span className="relative flex size-2">
        {state === 'live' && (
          <span className="absolute inset-0 rounded-full bg-up animate-ping-soft" />
        )}
        <span
          className={cn(
            'relative size-2 rounded-full',
            state === 'live' ? 'bg-up' : state === 'connecting' ? 'bg-degraded' : 'bg-paused',
          )}
        />
      </span>
      <span className="max-sm:sr-only">{LABELS[state]}</span>
    </span>
  );
}
