import { cn } from '../lib/cn';
import { useLive } from '../live/live-provider';

const LABELS = { live: 'Live', connecting: 'Connecting…', offline: 'Offline' } as const;

/** Tells the viewer whether what they see is updating by itself. */
export function LiveIndicator({ className }: { className?: string }) {
  const { state } = useLive();
  return (
    <span
      role="status"
      title={state === 'live' ? 'Updates arrive in real time' : 'Trying to reconnect'}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted',
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
      {LABELS[state]}
    </span>
  );
}
