import { useQuery } from '@tanstack/react-query';
import {
  formatInterval,
  MONITOR_TYPES,
  type MonitorStatus,
  type MonitorSummaryDto,
  type MonitorType,
} from '@vigil/shared';
import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Sparkline } from '../../components/charts/sparkline';
import { STATUS_META, STATUS_PRIORITY, StatusDot } from '../../components/status';
import { Button } from '../../components/ui/button';
import { Card, Skeleton } from '../../components/ui/card';
import { inputClass } from '../../components/ui/field';
import { Segmented } from '../../components/ui/segmented';
import { cn } from '../../lib/cn';
import { formatMs, formatUptime, pluralize } from '../../lib/format';
import { timeAgo, useNow } from '../../lib/time';
import { MonitorSheet } from './monitor-sheet';
import { overviewQuery } from './monitors.api';
import { describeTarget, TYPE_META } from './presentation';

type Filter = 'all' | 'problems' | 'up' | 'paused';

const matchesFilter: Record<Filter, (status: MonitorStatus) => boolean> = {
  all: () => true,
  problems: (s) => s === 'down' || s === 'degraded',
  up: (s) => s === 'up',
  paused: (s) => s === 'paused',
};

const isMonitorType = (value: string | null): value is MonitorType =>
  MONITOR_TYPES.includes(value as MonitorType);

export function MonitorsPage() {
  const { data: monitors, isPending } = useQuery(overviewQuery);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  // "?new=http" opens the sheet – works with the back button and can be bookmarked
  const newType = params.get('new');
  const sheetOpen = newType !== null;
  const openSheet = (type: MonitorType = 'http') => setParams({ new: type });
  const closeSheet = () => setParams({}, { replace: true });

  // "N" opens a new monitor, like in Linear / GitHub
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target.closest('input, textarea, select, [contenteditable], dialog')) return;
      event.preventDefault();
      setParams({ new: 'http' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setParams]);

  const counts = useMemo(() => {
    const list = monitors ?? [];
    return {
      all: list.length,
      problems: list.filter((m) => matchesFilter.problems(m.status)).length,
      up: list.filter((m) => m.status === 'up').length,
      paused: list.filter((m) => m.status === 'paused').length,
    };
  }, [monitors]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (monitors ?? [])
      .filter((m) => matchesFilter[filter](m.status))
      .filter(
        (m) =>
          !query ||
          m.name.toLowerCase().includes(query) ||
          describeTarget(m).toLowerCase().includes(query),
      )
      .sort(
        (a, b) =>
          STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.name.localeCompare(b.name),
      );
  }, [monitors, filter, search]);

  const sheet = (
    <MonitorSheet
      open={sheetOpen}
      onClose={closeSheet}
      initialType={isMonitorType(newType) ? newType : 'http'}
      onCreated={(monitor) => navigate(`/admin/monitors/${monitor.id}`)}
    />
  );

  if (isPending) return <MonitorsSkeleton />;

  if (monitors?.length === 0) {
    return (
      <>
        <EmptyState onCreate={openSheet} />
        {sheet}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Monitors</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {pluralize(counts.all, 'monitor')}
            {counts.problems > 0 ? (
              <span className="text-down"> · {counts.problems} need attention</span>
            ) : (
              ' · everything is fine'
            )}
          </p>
        </div>
        <Button variant="primary" onClick={() => openSheet()}>
          <Plus /> New monitor
          <kbd className="ml-1 rounded border border-canvas/30 px-1 font-mono text-[10px] opacity-70 max-sm:hidden">
            N
          </kbd>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filter monitors"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'problems', label: 'Issues', count: counts.problems },
            { value: 'up', label: 'Up', count: counts.up },
            { value: 'paused', label: 'Paused', count: counts.paused },
          ]}
        />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or host"
            aria-label="Search monitors"
            className={cn(inputClass, 'pl-9')}
          />
        </div>
      </div>

      <Card>
        {visible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-fg-muted">
            No monitors match this filter.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((monitor) => (
              <MonitorRow key={monitor.id} monitor={monitor} />
            ))}
          </ul>
        )}
      </Card>

      {sheet}
    </div>
  );
}

function MonitorRow({ monitor }: { monitor: MonitorSummaryDto }) {
  const now = useNow();
  const meta = STATUS_META[monitor.status];
  const showProblem =
    (monitor.status === 'down' || monitor.status === 'degraded') && monitor.lastMessage;

  return (
    <li>
      <Link
        to={`/admin/monitors/${monitor.id}`}
        className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-4 py-3.5 transition-colors hover:bg-surface-muted/60 sm:px-5 md:grid-cols-[minmax(0,1fr)_120px_80px_80px_110px]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <StatusDot status={monitor.status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{monitor.name}</span>
              <span className={cn('text-xs font-medium md:hidden', meta.text)}>{meta.label}</span>
            </div>
            <p
              className={cn(
                'truncate text-xs',
                showProblem ? 'text-down' : 'font-mono text-fg-muted',
              )}
            >
              {showProblem ? monitor.lastMessage : describeTarget(monitor)}
            </p>
          </div>
        </div>

        <div className="max-md:hidden">
          <Sparkline points={monitor.recentChecks} />
        </div>

        <Metric label="Uptime 24h" value={formatUptime(monitor.uptime24h)} />
        <Metric
          label="Response"
          value={formatMs(monitor.lastResponseMs)}
          className="max-md:hidden"
        />

        <div className="text-right text-xs text-fg-muted max-md:hidden">
          <div className="tabular">
            {monitor.status === 'paused' ? 'Paused' : timeAgo(monitor.lastCheckedAt, now)}
          </div>
          <div className="text-fg-subtle">
            {TYPE_META[monitor.type].label} · {formatInterval(monitor.intervalSeconds)}
          </div>
        </div>
      </Link>
    </li>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('text-right', className)}>
      <div className="text-sm font-medium tabular">{value}</div>
      <div className="text-[11px] text-fg-subtle">{label}</div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: (type: MonitorType) => void }) {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Nothing is being watched yet</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Add your first monitor – checks start the moment you save, and you get a ping when something
        breaks.
      </p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
        {MONITOR_TYPES.map((type) => {
          const meta = TYPE_META[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onCreate(type)}
              className="group rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-line-strong"
            >
              <meta.Icon className="size-5 text-fg-muted transition-colors group-hover:text-fg" />
              <div className="mt-3 text-sm font-medium">{meta.label}</div>
              <div className="mt-1 text-xs leading-snug text-fg-muted">{meta.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonitorsSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-10 w-48" />
      <Card className="divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-2.5 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-6 w-28" />
          </div>
        ))}
      </Card>
    </div>
  );
}
