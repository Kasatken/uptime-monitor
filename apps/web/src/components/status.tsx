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
  dot: string;
  text: string;
  fill: string;
}

// Full class names, not built from strings, so Tailwind can find them.
export const STATUS_META: Record<MonitorStatus, StatusMeta> = {
  up: {
    label: 'Работает',
    Icon: CircleCheck,
    dot: 'bg-up',
    text: 'text-up',
    fill: 'bg-lime text-on-color',
  },
  degraded: {
    label: 'Есть проблемы',
    Icon: CircleAlert,
    dot: 'bg-degraded',
    text: 'text-degraded',
    fill: 'bg-sun text-on-color',
  },
  down: {
    label: 'Не работает',
    Icon: CircleX,
    dot: 'bg-down',
    text: 'text-down',
    fill: 'bg-tomato text-on-color',
  },
  pending: {
    label: 'Ожидание',
    Icon: CircleDashed,
    dot: 'bg-pending',
    text: 'text-pending',
    fill: 'bg-lavender text-on-color',
  },
  paused: {
    label: 'На паузе',
    Icon: CirclePause,
    dot: 'bg-paused',
    text: 'text-paused',
    fill: 'bg-surface-muted text-fg',
  },
};

export const OVERALL_META: Record<OverallStatus, { title: string; status: MonitorStatus }> = {
  operational: { title: 'Все системы работают', status: 'up' },
  degraded: { title: 'Есть небольшие проблемы', status: 'degraded' },
  partial_outage: { title: 'Частичный сбой', status: 'down' },
  major_outage: { title: 'Серьёзный сбой', status: 'down' },
  unknown: { title: 'Пока нет данных', status: 'pending' },
};

export const STATUS_PRIORITY: Record<MonitorStatus, number> = {
  down: 0,
  degraded: 1,
  pending: 2,
  up: 3,
  paused: 4,
};

export const needsAttention = (status: MonitorStatus) => status === 'down' || status === 'degraded';

export function StatusDot({ status, className }: { status: MonitorStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn('relative inline-flex size-2.5 shrink-0', className)} aria-hidden>
      {needsAttention(status) && (
        <span className={cn('absolute inset-0 rounded-full animate-ping-soft', meta.dot)} />
      )}
      <span className={cn('relative inline-flex size-full rounded-full', meta.dot)} />
    </span>
  );
}

export function StatusChip({
  status,
  onColor = false,
  className,
}: {
  status: MonitorStatus;
  onColor?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap',
        onColor ? 'bg-white/55 text-on-color' : meta.fill,
        className,
      )}
    >
      <meta.Icon className="size-4" aria-hidden />
      {meta.label}
    </span>
  );
}

export function uptimeTone(uptime: number | null): string {
  if (uptime === null) return 'bg-surface-muted';
  if (uptime >= 0.999) return 'bg-lime';
  if (uptime >= 0.95) return 'bg-sun';
  return 'bg-tomato';
}
