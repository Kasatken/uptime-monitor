import { useQuery } from '@tanstack/react-query';
import { formatDuration, formatInterval, type MonitorDto } from '@vigil/shared';
import {
  ArrowLeft,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ResponseChart } from '../../components/charts/response-chart';
import { UptimeBars, UptimeBarsLegend } from '../../components/charts/uptime-bars';
import { STATUS_META, StatusChip, StatusDot } from '../../components/status';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, Chip, Skeleton } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { Segmented } from '../../components/ui/segmented';
import { isUnauthorized } from '../../lib/api-client';
import { cn } from '../../lib/cn';
import { formatMs, formatUptime } from '../../lib/format';
import { formatDateTime, formatTime, timeAgo, useNow } from '../../lib/time';
import { monitorIncidentsQuery } from '../incidents/incidents.api';
import { HeartbeatSnippet } from './heartbeat-snippet';
import { MonitorSheet } from './monitor-sheet';
import {
  checksQuery,
  monitorQuery,
  responseTimesQuery,
  statsQuery,
  useDeleteMonitor,
  useRunCheck,
  useTogglePause,
} from './monitors.api';
import { describeTarget, TYPE_META } from './presentation';

const RANGES = [
  { value: 6, label: '6 ч' },
  { value: 24, label: '24 ч' },
  { value: 168, label: '7 дней' },
];

export function MonitorDetailPage() {
  const { id = '' } = useParams();
  const { data: monitor, isPending, error } = useQuery(monitorQuery(id));

  if (isPending) return <DetailSkeleton />;
  if (!monitor) {
    if (isUnauthorized(error)) return null;
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-bold">Такого монитора больше нет</p>
        <Link to="/admin" className="mt-3 inline-block font-medium text-fg-muted hover:text-fg">
          ← Ко всем мониторам
        </Link>
      </div>
    );
  }
  return <MonitorDetail monitor={monitor} />;
}

function MonitorDetail({ monitor }: { monitor: MonitorDto }) {
  const [params, setParams] = useSearchParams();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stats = useQuery(statsQuery(monitor.id));
  const now = useNow();

  return (
    <div className="space-y-4">
      <Link
        to="/admin"
        className="mb-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-4 text-[13px] font-semibold shadow-card hover:bg-surface-muted"
      >
        <ArrowLeft className="size-4" /> Все мониторы
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Hero
          monitor={monitor}
          onEdit={() => setParams({ edit: '1' })}
          onDelete={() => setConfirmDelete(true)}
        />

        <div className="grid grid-cols-2 gap-4">
          <StatTile
            label="Аптайм за 24 ч"
            value={formatUptime(stats.data?.uptime['24h'] ?? null)}
            loading={stats.isPending}
          />
          <StatTile
            label="Аптайм за 30 дней"
            value={formatUptime(stats.data?.uptime['30d'] ?? null)}
            loading={stats.isPending}
          />
          {monitor.type === 'heartbeat' ? (
            <StatTile
              label="Последний сигнал"
              value={timeAgo(monitor.lastHeartbeatAt, now)}
              hint={
                monitor.lastHeartbeatAt ? formatDateTime(monitor.lastHeartbeatAt) : 'Ждём первый'
              }
              fill="bg-mint"
            />
          ) : (
            <StatTile
              label="Средний ответ"
              value={formatMs(stats.data?.avgResponseMs24h ?? null)}
              hint={
                stats.data?.p95ResponseMs24h
                  ? `p95 — ${formatMs(stats.data.p95ResponseMs24h)}`
                  : 'за 24 часа'
              }
              loading={stats.isPending}
              fill="bg-mint"
            />
          )}
          <SslTile monitor={monitor} now={now} />
        </div>
      </div>

      {monitor.type === 'heartbeat' && monitor.heartbeatToken && (
        <HeartbeatSnippet
          token={monitor.heartbeatToken}
          intervalSeconds={monitor.intervalSeconds}
        />
      )}

      {monitor.type !== 'heartbeat' && <ResponseTimeCard monitorId={monitor.id} />}

      <Card className="pb-6">
        <CardHeader
          title="Последние 90 дней"
          description={`Аптайм ${formatUptime(stats.data?.uptime['90d'] ?? null)}`}
        />
        <div className="px-5 pt-5 sm:px-6">
          {stats.data ? (
            <>
              <UptimeBars days={stats.data.days} label="Аптайм по дням за последние 90 дней" />
              <UptimeBarsLegend days={stats.data.days.length} />
            </>
          ) : (
            <Skeleton className="h-10 rounded-full" />
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RecentChecks monitorId={monitor.id} />
        <MonitorIncidents monitorId={monitor.id} />
      </div>

      <MonitorSheet
        open={params.get('edit') === '1'}
        onClose={() => setParams({}, { replace: true })}
        monitor={monitor}
      />
      <DeleteDialog
        monitor={monitor}
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Hero({
  monitor,
  onEdit,
  onDelete,
}: {
  monitor: MonitorDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const now = useNow();
  const runCheck = useRunCheck(monitor.id);
  const togglePause = useTogglePause(monitor);
  const meta = STATUS_META[monitor.status];
  const paused = monitor.status === 'paused';
  const onColor = !paused;
  const problem =
    (monitor.status === 'down' || monitor.status === 'degraded') && monitor.lastMessage;

  const checkNow = () =>
    runCheck.mutate(undefined, {
      onSuccess: (check) => {
        if (!check) toast.info('Проверять пока нечего — ждём первый сигнал');
        else if (check.status === 'down') toast.error(`Проверка не прошла: ${check.message ?? ''}`);
        else toast.success(`${STATUS_META[check.status].label} · ${formatMs(check.responseMs)}`);
      },
      onError: (error) => toast.error(error.message),
    });

  const lastSeen = `Проверен ${timeAgo(monitor.lastCheckedAt, now)}`;

  return (
    <section className={cn('flex flex-col gap-6 rounded-card p-6 sm:p-7', meta.fill)}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={monitor.status} onColor={onColor} />
        <Chip className={onColor ? 'bg-white/35 text-on-color' : undefined}>
          {TYPE_META[monitor.type].label}
        </Chip>
        <Chip className={onColor ? 'bg-white/35 text-on-color' : undefined}>
          каждые {formatInterval(monitor.intervalSeconds)}
        </Chip>
      </div>

      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl">
          {monitor.name}
        </h1>
        {monitor.type === 'http' ? (
          <a
            href={monitor.config.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-mono text-sm opacity-70 hover:opacity-100"
          >
            {describeTarget(monitor)} <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <p className="mt-2 font-mono text-sm opacity-70">{describeTarget(monitor)}</p>
        )}
      </div>

      {problem && (
        <p className="rounded-2xl bg-white/55 px-4 py-3 text-sm font-semibold">
          {monitor.lastMessage}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-6">
        <div>
          {monitor.type === 'heartbeat' ? (
            <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {monitor.lastHeartbeatAt ? timeAgo(monitor.lastHeartbeatAt, now) : '—'}
            </p>
          ) : (
            <p className="font-display text-5xl font-semibold tracking-tight tabular sm:text-6xl">
              {formatMs(monitor.lastResponseMs)}
            </p>
          )}
          <p className="mt-1 text-sm opacity-70">
            {paused
              ? 'Проверки на паузе'
              : monitor.type === 'heartbeat'
                ? 'последний сигнал'
                : lastSeen}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="night" onClick={checkNow} loading={runCheck.isPending} disabled={paused}>
            {!runCheck.isPending && <RefreshCw />} Проверить
          </Button>
          <Button
            variant={onColor ? 'onColor' : 'secondary'}
            size="icon"
            aria-label={paused ? 'Возобновить' : 'Поставить на паузу'}
            title={paused ? 'Возобновить' : 'Поставить на паузу'}
            loading={togglePause.isPending}
            onClick={() =>
              togglePause.mutate(undefined, {
                onSuccess: (m) =>
                  toast.success(
                    m.status === 'paused' ? 'Мониторинг на паузе' : 'Мониторинг возобновлён',
                  ),
              })
            }
          >
            {!togglePause.isPending && (paused ? <Play /> : <Pause />)}
          </Button>
          <Button
            variant={onColor ? 'onColor' : 'secondary'}
            size="icon"
            aria-label="Изменить"
            title="Изменить"
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            variant={onColor ? 'onColor' : 'secondary'}
            size="icon"
            aria-label="Удалить"
            title="Удалить"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  fill,
  loading,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  fill?: string;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-36 flex-col rounded-card p-5',
        fill ? `${fill} text-on-color` : 'bg-surface shadow-card',
      )}
    >
      <p className={cn('text-sm font-medium', fill ? 'opacity-70' : 'text-fg-muted')}>{label}</p>
      <div className="mt-auto pt-4">
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight tabular sm:text-3xl">
            {icon}
            {value}
          </p>
        )}
        {hint && (
          <p className={cn('mt-1 text-xs tabular', fill ? 'opacity-70' : 'text-fg-subtle')}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function SslTile({ monitor, now }: { monitor: MonitorDto; now: number }) {
  if (monitor.type !== 'http' || !monitor.config.url.startsWith('https:')) {
    return (
      <StatTile
        label="Тревога после"
        value={`${monitor.failureThreshold} ${monitor.failureThreshold === 1 ? 'сбоя' : 'сбоев'}`}
        hint="подряд"
        fill="bg-pink"
      />
    );
  }
  if (!monitor.sslExpiresAt) {
    return (
      <StatTile
        label="SSL-сертификат"
        value="—"
        hint="Проверим при следующем запуске"
        fill="bg-pink"
      />
    );
  }
  const daysLeft = Math.floor((new Date(monitor.sslExpiresAt).getTime() - now) / 86_400_000);
  const fill = daysLeft <= 7 ? 'bg-tomato' : daysLeft <= 21 ? 'bg-sun' : 'bg-pink';
  return (
    <StatTile
      label="SSL-сертификат"
      value={`${daysLeft} дн.`}
      icon={daysLeft > 21 ? <ShieldCheck className="size-6" aria-hidden /> : undefined}
      hint={`до ${formatDateTime(monitor.sslExpiresAt)}`}
      fill={fill}
    />
  );
}

function ResponseTimeCard({ monitorId }: { monitorId: string }) {
  const [hours, setHours] = useState(24);
  const { data: points, isPending } = useQuery(responseTimesQuery(monitorId, hours));

  return (
    <section className="rounded-card bg-night p-5 text-white sm:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Время ответа</h2>
          <p className="text-sm text-white/50">
            До первого байта. Красные точки — неудачные проверки.
          </p>
        </div>
        <Segmented
          size="sm"
          tone="dark"
          label="Период"
          value={hours}
          onChange={setHours}
          options={RANGES}
        />
      </header>
      {isPending ? (
        <div className="h-[220px] animate-pulse rounded-2xl bg-white/5" />
      ) : (
        <ResponseChart points={points ?? []} />
      )}
    </section>
  );
}

function RecentChecks({ monitorId }: { monitorId: string }) {
  const { data: checks, isPending } = useQuery(checksQuery(monitorId));

  return (
    <Card className="min-w-0 pb-2">
      <CardHeader title="Последние проверки" description="Обновляются сами" />
      {isPending ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : checks?.length === 0 ? (
        <p className="px-6 py-10 text-center text-fg-muted">Проверок ещё не было.</p>
      ) : (
        <ol className="mt-3 max-h-[26rem] space-y-1 overflow-auto px-3 pb-3">
          {checks?.map((check) => (
            <li
              key={check.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-muted"
            >
              <StatusDot status={check.status} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {check.statusCode ? `HTTP ${check.statusCode}` : STATUS_META[check.status].label}
                  <span className="ml-2 font-normal text-fg-subtle tabular">
                    {formatTime(check.checkedAt)}
                  </span>
                </p>
                {check.message && (
                  <p className="truncate text-xs text-fg-muted" title={check.message}>
                    {check.message}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold tabular">{formatMs(check.responseMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function MonitorIncidents({ monitorId }: { monitorId: string }) {
  const now = useNow();
  const { data: incidents } = useQuery(monitorIncidentsQuery(monitorId));

  return (
    <Card className="min-w-0 pb-2">
      <CardHeader title="Инциденты" />
      {!incidents || incidents.length === 0 ? (
        <p className="px-6 py-10 text-center text-fg-muted">Сбоев не было. Так держать.</p>
      ) : (
        <ol className="mt-3 max-h-[26rem] space-y-2 overflow-auto px-3 pb-3">
          {incidents.map((incident) => {
            const ongoing = incident.resolvedAt === null;
            const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
            return (
              <li
                key={incident.id}
                className={cn(
                  'rounded-3xl px-4 py-3',
                  ongoing ? 'bg-tomato text-on-color' : 'bg-surface-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2 text-sm font-bold">
                  <span>{ongoing ? 'Продолжается' : 'Устранён'}</span>
                  <span className="tabular">
                    {formatDuration(end - new Date(incident.startedAt).getTime())}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-0.5 truncate text-xs',
                    ongoing ? 'opacity-80' : 'text-fg-muted',
                  )}
                >
                  {incident.cause ?? 'Без подробностей'}
                </p>
                <p
                  className={cn(
                    'mt-0.5 text-xs tabular',
                    ongoing ? 'opacity-70' : 'text-fg-subtle',
                  )}
                >
                  {formatDateTime(incident.startedAt)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function DeleteDialog({
  monitor,
  open,
  onClose,
}: {
  monitor: MonitorDto;
  open: boolean;
  onClose: () => void;
}) {
  const remove = useDeleteMonitor();
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Удалить «${monitor.name}»?`}
      description="История проверок, статистика и инциденты удалятся вместе с ним — это нельзя отменить. Если нужно просто остановить проверки, поставьте монитор на паузу."
    >
      <div className="flex justify-end gap-2 px-6 pt-2 pb-6">
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(monitor.id, {
              onSuccess: () => {
                toast.success(`«${monitor.name}» удалён`);
                navigate('/admin', { replace: true });
              },
              onError: (error) => toast.error(error.message),
            })
          }
        >
          Удалить
        </Button>
      </div>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-9 w-40 rounded-full" />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-80 rounded-card" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-card" />
          ))}
        </div>
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
