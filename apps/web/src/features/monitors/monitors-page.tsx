import { useQuery } from '@tanstack/react-query';
import {
  formatInterval,
  MONITOR_TYPES,
  type MonitorStatus,
  type MonitorSummaryDto,
  type MonitorType,
} from '@vigil/shared';
import {
  Activity,
  CircleAlert,
  CircleCheck,
  type LucideIcon,
  Percent,
  Plus,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Sparkline } from '../../components/charts/sparkline';
import { needsAttention, STATUS_META, STATUS_PRIORITY, StatusChip } from '../../components/status';
import { ArrowBadge, Button } from '../../components/ui/button';
import { Chip, Skeleton } from '../../components/ui/card';
import { inputClass } from '../../components/ui/field';
import { Segmented } from '../../components/ui/segmented';
import { cn } from '../../lib/cn';
import { formatMs, formatUptime, greeting, plural } from '../../lib/format';
import { timeAgo, useNow } from '../../lib/time';
import { MonitorSheet } from './monitor-sheet';
import { overviewQuery } from './monitors.api';
import { describeTarget, TYPE_META } from './presentation';

type Filter = 'all' | 'problems' | 'up' | 'paused';

const matchesFilter: Record<Filter, (status: MonitorStatus) => boolean> = {
  all: () => true,
  problems: needsAttention,
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

  // The sheet lives in the URL (?new=http): the back button closes it and it can be bookmarked
  const newType = params.get('new');
  const openSheet = (type: MonitorType = 'http') => setParams({ new: type });
  const closeSheet = () => setParams({}, { replace: true });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.code !== 'KeyN' || event.metaKey || event.ctrlKey || event.altKey) return;
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
      problems: list.filter((m) => needsAttention(m.status)).length,
      down: list.filter((m) => m.status === 'down').length,
      up: list.filter((m) => m.status === 'up').length,
      paused: list.filter((m) => m.status === 'paused').length,
    };
  }, [monitors]);

  const averageUptime = useMemo(() => {
    const values = (monitors ?? []).map((m) => m.uptime24h).filter((v): v is number => v !== null);
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
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
      open={newType !== null}
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

  const headline =
    counts.down > 0
      ? `${counts.down} ${plural(counts.down, ['сервис не работает', 'сервиса не работают', 'сервисов не работают'])}`
      : counts.problems > 0
        ? 'Почти всё хорошо'
        : 'Всё работает';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-medium text-fg-muted">{greeting()} 👋</p>
          <h1 className="mt-1 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
            {headline}
          </h1>
        </div>
        <Button variant="primary" onClick={() => openSheet()}>
          <Plus /> Новый монитор
          <kbd className="ml-1 rounded-md bg-ink-fg/15 px-1.5 font-mono text-[11px] max-sm:hidden">
            N
          </kbd>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile Icon={Activity} label="Всего мониторов" value={String(counts.all)} />
        <StatTile Icon={CircleCheck} label="Работают" value={String(counts.up)} fill="bg-lime" />
        <StatTile
          Icon={CircleAlert}
          label="С проблемами"
          value={String(counts.problems)}
          fill={counts.problems > 0 ? 'bg-tomato' : undefined}
        />
        <StatTile
          Icon={Percent}
          label="Аптайм за 24 часа"
          value={formatUptime(averageUptime)}
          fill="bg-lavender"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Фильтр мониторов"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все', count: counts.all },
            { value: 'problems', label: 'Проблемы', count: counts.problems },
            { value: 'up', label: 'Работают', count: counts.up },
            { value: 'paused', label: 'На паузе', count: counts.paused },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию или адресу"
            aria-label="Поиск мониторов"
            className={cn(inputClass, 'h-10 rounded-full bg-surface pl-10 shadow-card')}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card bg-surface px-6 py-14 text-center text-fg-muted shadow-card">
          Под этот фильтр ничего не подходит.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((monitor) => (
            <MonitorCard key={monitor.id} monitor={monitor} />
          ))}
        </ul>
      )}

      {sheet}
    </div>
  );
}

function StatTile({
  Icon,
  label,
  value,
  fill,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  fill?: string;
}) {
  return (
    <div
      className={cn('rounded-card p-5', fill ? `${fill} text-on-color` : 'bg-surface shadow-card')}
    >
      <span
        className={cn(
          'grid size-10 place-items-center rounded-full',
          fill ? 'bg-white/55' : 'bg-surface-muted',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-6 font-display text-3xl font-semibold tracking-tight tabular sm:text-4xl">
        {value}
      </p>
      <p className={cn('mt-1 text-sm font-medium', fill ? 'opacity-70' : 'text-fg-muted')}>
        {label}
      </p>
    </div>
  );
}

function MonitorCard({ monitor }: { monitor: MonitorSummaryDto }) {
  const now = useNow();
  const loud = needsAttention(monitor.status);
  const paused = monitor.status === 'paused';
  const isHeartbeat = monitor.type === 'heartbeat';

  return (
    <li>
      <Link
        to={`/admin/monitors/${monitor.id}`}
        className={cn(
          'group flex h-full flex-col gap-5 rounded-card p-5 transition hover:-translate-y-0.5',
          loud ? STATUS_META[monitor.status].fill : 'bg-surface shadow-card hover:shadow-lg',
          paused && 'opacity-70',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={monitor.status} onColor={loud} />
          <Chip className={loud ? 'bg-white/35 text-on-color' : undefined}>
            {TYPE_META[monitor.type].label}
          </Chip>
        </div>

        <div className="min-w-0">
          <p className="truncate text-xl font-bold tracking-tight">{monitor.name}</p>
          <p
            className={cn(
              'mt-1 truncate text-sm',
              loud && monitor.lastMessage ? 'font-medium' : 'font-mono text-[13px] opacity-60',
            )}
          >
            {loud && monitor.lastMessage ? monitor.lastMessage : describeTarget(monitor)}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-3xl font-semibold tracking-tight tabular">
              {isHeartbeat ? formatUptime(monitor.uptime24h) : formatMs(monitor.lastResponseMs)}
            </p>
            <p className={cn('text-xs', loud ? 'opacity-70' : 'text-fg-muted')}>
              {isHeartbeat ? 'аптайм за 24 ч' : 'последний ответ'}
            </p>
          </div>
          <div className="max-[380px]:hidden">
            <Sparkline points={monitor.recentChecks} onColor={loud} width={110} />
          </div>
          <ArrowBadge onColor={loud} />
        </div>

        <p className={cn('text-[13px]', loud ? 'opacity-70' : 'text-fg-muted')}>
          {paused
            ? 'Проверки приостановлены'
            : `Каждые ${formatInterval(monitor.intervalSeconds)} · ${timeAgo(monitor.lastCheckedAt, now)}`}
          {!isHeartbeat && !paused && ` · аптайм ${formatUptime(monitor.uptime24h)}`}
        </p>
      </Link>
    </li>
  );
}

function EmptyState({ onCreate }: { onCreate: (type: MonitorType) => void }) {
  return (
    <div className="space-y-8 py-4">
      <div>
        <p className="font-medium text-fg-muted">{greeting()} 👋</p>
        <h1 className="mt-1 max-w-2xl font-display text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Пока ничего не отслеживается
        </h1>
        <p className="mt-3 max-w-xl text-fg-muted">
          Добавьте первый монитор — проверка запустится сразу после сохранения, а если что-то
          сломается, придёт уведомление.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {MONITOR_TYPES.map((type) => {
          const meta = TYPE_META[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onCreate(type)}
              className={cn(
                'group flex min-h-56 flex-col rounded-card p-6 text-left text-on-color transition hover:-translate-y-0.5',
                meta.fill,
              )}
            >
              <span className="grid size-12 place-items-center rounded-full bg-white/55">
                <meta.Icon className="size-6" aria-hidden />
              </span>
              <span className="mt-6 text-xl font-bold">{meta.label}</span>
              <span className="mt-1.5 text-sm leading-snug opacity-75">{meta.description}</span>
              <ArrowBadge onColor className="mt-auto self-end" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonitorsSkeleton() {
  return (
    <div className="space-y-8" aria-busy>
      <Skeleton className="h-16 w-80" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 rounded-card" />
        ))}
      </div>
    </div>
  );
}
