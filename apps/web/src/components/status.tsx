import type { MonitorStatus, OverallStatus } from '@vigil/shared';
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';

interface StatusMeta {
  label: string;
  Icon: LucideIcon;
  /** solid color, for dots and bars */
  dot: string;
  /** colored text */
  text: string;
  /** tinted background + text, for badges */
  soft: string;
}

// Full class names (not built from strings), so Tailwind can see them.
export const STATUS_META: Record<MonitorStatus, StatusMeta> = {
  up: {
    label: 'Operational',
    Icon: CircleCheck,
    dot: 'bg-up',
    text: 'text-up',
    soft: 'bg-up/12 text-up',
  },
  degraded: {
    label: 'Degraded',
    Icon: CircleAlert,
    dot: 'bg-degraded',
    text: 'text-degraded',
    soft: 'bg-degraded/15 text-degraded',
  },
  down: {
    label: 'Down',
    Icon: CircleX,
    dot: 'bg-down',
    text: 'text-down',
    soft: 'bg-down/12 text-down',
  },
  pending: {
    label: 'Pending',
    Icon: CircleDashed,
    dot: 'bg-pending',
    text: 'text-pending',
    soft: 'bg-pending/12 text-pending',
  },
  paused: {
    label: 'Paused',
    Icon: CirclePause,
    dot: 'bg-paused',
    text: 'text-paused',
    soft: 'bg-paused/12 text-paused',
  },
};

export const OVERALL_META: Record<OverallStatus, { title: string; status: MonitorStatus }> = {
  operational: { title: 'All systems operational', status: 'up' },
  degraded: { title: 'Degraded performance', status: 'degraded' },
  partial_outage: { title: 'Partial outage', status: 'down' },
  major_outage: { title: 'Major outage', status: 'down' },
  unknown: { title: 'No data yet', status: 'pending' },
};

/** Sort weight: problems first. */
export const STATUS_PRIORITY: Record<MonitorStatus, number> = {
  down: 0,
  degraded: 1,
  pending: 2,
  up: 3,
  paused: 4,
};

export function StatusDot({ status, className }: { status: MonitorStatus; className?: string }) {
  const meta = STATUS_META[status];
  const alerting = status === 'down' || status === 'degraded';
  return (
    <span className={cn('relative inline-flex size-2.5 shrink-0', className)} aria-hidden>
      {alerting && (
        <span className={cn('absolute inset-0 rounded-full animate-ping-soft', meta.dot)} />
      )}
      <span className={cn('relative inline-flex size-full rounded-full', meta.dot)} />
    </span>
  );
}

export function StatusBadge({ status, className }: { status: MonitorStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium',
        meta.soft,
        className,
      )}
    >
      <meta.Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

/** Tailwind class for a day/bar by its uptime ratio. */
export function uptimeTone(uptime: number | null): string {
  if (uptime === null) return 'bg-line';
  if (uptime >= 0.999) return 'bg-up';
  if (uptime >= 0.95) return 'bg-degraded';
  return 'bg-down';
}
