import { useQuery } from '@tanstack/react-query';
import { formatDuration, formatInterval, type MonitorDto } from '@vigil/shared';
import {
  ArrowLeft,
  CircleAlert,
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
import { STATUS_META, StatusBadge, StatusDot } from '../../components/status';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, Skeleton } from '../../components/ui/card';
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
  { value: 6, label: '6h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
];

export function MonitorDetailPage() {
  const { id = '' } = useParams();
  const { data: monitor, isPending, error } = useQuery(monitorQuery(id));

  if (isPending) return <DetailSkeleton />;
  if (!monitor) {
    if (isUnauthorized(error)) return null;
    return (
      <div className="py-20 text-center">
        <p className="font-medium">This monitor doesn't exist anymore.</p>
        <Link to="/admin" className="mt-2 inline-block text-sm text-fg-muted hover:text-fg">
          ← Back to monitors
        </Link>
      </div>
    );
  }
  return <MonitorDetail monitor={monitor} />;
}

function MonitorDetail({ monitor }: { monitor: MonitorDto }) {
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stats = useQuery(statsQuery(monitor.id));
  const editing = params.get('edit') === '1';
  const showProblem =
    (monitor.status === 'down' || monitor.status === 'degraded') && monitor.lastMessage;
  const TypeIcon = TYPE_META[monitor.type].Icon;

  return (
    <div className="space-y-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Monitors
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{monitor.name}</h1>
            <StatusBadge status={monitor.status} />
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            <TypeIcon className="size-4" aria-hidden />
            {monitor.type === 'http' ? (
              <a
                href={monitor.config.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[13px] hover:text-fg"
              >
                {describeTarget(monitor)} <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="font-mono text-[13px]">{describeTarget(monitor)}</span>
            )}
            <span aria-hidden>·</span>
            <span>{describeSchedule(monitor, now)}</span>
          </p>
        </div>
        <MonitorActions
          monitor={monitor}
          onEdit={() => setParams({ edit: '1' })}
          onDelete={() => setConfirmDelete(true)}
        />
      </header>

      {showProblem && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
            monitor.status === 'down'
              ? 'border-down/30 bg-down/8 text-down'
              : 'border-degraded/30 bg-degraded/10 text-degraded',
          )}
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span className="text-fg">
            <span className="font-medium">{STATUS_META[monitor.status].label}:</span>{' '}
            {monitor.lastMessage}
          </span>
        </div>
      )}

      {monitor.type === 'heartbeat' && monitor.heartbeatToken && (
        <HeartbeatSnippet
          token={monitor.heartbeatToken}
          intervalSeconds={monitor.intervalSeconds}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Uptime 24h"
          value={formatUptime(stats.data?.uptime['24h'] ?? null)}
          loading={stats.isPending}
        />
        <StatTile
          label="Uptime 30 days"
          value={formatUptime(stats.data?.uptime['30d'] ?? null)}
          loading={stats.isPending}
        />
        {monitor.type === 'heartbeat' ? (
          <StatTile
            label="Last ping"
            value={timeAgo(monitor.lastHeartbeatAt, now)}
            hint={
              monitor.lastHeartbeatAt
                ? formatDateTime(monitor.lastHeartbeatAt)
                : 'Waiting for the first ping'
            }
          />
        ) : (
          <StatTile
            label="Avg response 24h"
            value={formatMs(stats.data?.avgResponseMs24h ?? null)}
            hint={
              stats.data?.p95ResponseMs24h
                ? `p95 ${formatMs(stats.data.p95ResponseMs24h)}`
                : undefined
            }
            loading={stats.isPending}
          />
        )}
        <SslTile monitor={monitor} now={now} />
      </div>

      {monitor.type !== 'heartbeat' && <ResponseTimeCard monitorId={monitor.id} />}

      <Card>
        <CardHeader
          title="Last 90 days"
          description={`${formatUptime(stats.data?.uptime['90d'] ?? null)} uptime`}
        />
        <div className="p-4 sm:p-5">
          {stats.data ? (
            <>
              <UptimeBars days={stats.data.days} label="Daily uptime for the last 90 days" />
              <UptimeBarsLegend days={stats.data.days.length} />
            </>
          ) : (
            <Skeleton className="h-8" />
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RecentChecks monitorId={monitor.id} />
        <MonitorIncidents monitorId={monitor.id} />
      </div>

      <MonitorSheet
        open={editing}
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

function describeSchedule(monitor: MonitorDto, now: number): string {
  if (monitor.status === 'paused') return 'Paused';
  const every = formatInterval(monitor.intervalSeconds);
  if (monitor.type === 'heartbeat') {
    return monitor.lastHeartbeatAt
      ? `Last ping ${timeAgo(monitor.lastHeartbeatAt, now)} · expected every ${every}`
      : `Waiting for the first ping · expected every ${every}`;
  }
  return `Checked ${timeAgo(monitor.lastCheckedAt, now)} · every ${every}`;
}

function MonitorActions({
  monitor,
  onEdit,
  onDelete,
}: {
  monitor: MonitorDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const runCheck = useRunCheck(monitor.id);
  const togglePause = useTogglePause(monitor);
  const paused = monitor.status === 'paused';

  const checkNow = () =>
    runCheck.mutate(undefined, {
      onSuccess: (check) => {
        if (!check) toast.info('Nothing to check yet – waiting for the first ping');
        else if (check.status === 'down') toast.error(`Check failed: ${check.message ?? 'down'}`);
        else toast.success(`${STATUS_META[check.status].label} · ${formatMs(check.responseMs)}`);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={checkNow} loading={runCheck.isPending} disabled={paused}>
        {!runCheck.isPending && <RefreshCw />} Check now
      </Button>
      <Button
        onClick={() =>
          togglePause.mutate(undefined, {
            onSuccess: (m) =>
              toast.success(m.status === 'paused' ? 'Monitoring paused' : 'Monitoring resumed'),
          })
        }
        loading={togglePause.isPending}
      >
        {!togglePause.isPending && (paused ? <Play /> : <Pause />)}
        {paused ? 'Resume' : 'Pause'}
      </Button>
      <Button onClick={onEdit}>
        <Pencil /> Edit
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label="Delete monitor"
        title="Delete monitor"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone,
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  loading?: boolean;
}) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-xs text-fg-muted">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <div className={cn('mt-1 text-xl font-semibold tracking-tight tabular', tone)}>{value}</div>
      )}
      {hint && <div className="mt-0.5 text-xs text-fg-subtle tabular">{hint}</div>}
    </Card>
  );
}

function SslTile({ monitor, now }: { monitor: MonitorDto; now: number }) {
  if (monitor.type === 'http' && monitor.config.url.startsWith('https:')) {
    if (!monitor.sslExpiresAt)
      return <StatTile label="SSL certificate" value="—" hint="Checked with the next run" />;
    const daysLeft = Math.floor((new Date(monitor.sslExpiresAt).getTime() - now) / 86_400_000);
    const tone = daysLeft <= 7 ? 'text-down' : daysLeft <= 21 ? 'text-degraded' : undefined;
    return (
      <StatTile
        label="SSL certificate"
        value={
          <span className="inline-flex items-center gap-1.5">
            {daysLeft > 21 && <ShieldCheck className="size-5 text-up" aria-hidden />}
            {daysLeft} days
          </span>
        }
        tone={tone}
        hint={`Expires ${formatDateTime(monitor.sslExpiresAt)}`}
      />
    );
  }
  return (
    <StatTile
      label="Confirms after"
      value={`${monitor.failureThreshold} ${monitor.failureThreshold === 1 ? 'failure' : 'failures'}`}
      hint="in a row before alerting"
    />
  );
}

function ResponseTimeCard({ monitorId }: { monitorId: string }) {
  const [hours, setHours] = useState(24);
  const { data: points, isPending } = useQuery(responseTimesQuery(monitorId, hours));

  return (
    <Card>
      <CardHeader
        title="Response time"
        description="Time to first byte. Red marks are failed checks."
        action={
          <Segmented
            size="sm"
            label="Time range"
            value={hours}
            onChange={setHours}
            options={RANGES}
          />
        }
      />
      <div className="px-2 py-4 sm:px-4">
        {isPending ? (
          <Skeleton className="mx-2 h-[200px]" />
        ) : (
          <ResponseChart points={points ?? []} />
        )}
      </div>
    </Card>
  );
}

function RecentChecks({ monitorId }: { monitorId: string }) {
  const { data: checks, isPending } = useQuery(checksQuery(monitorId));

  return (
    <Card className="min-w-0">
      <CardHeader title="Recent checks" description="Updates live" />
      {isPending ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      ) : checks?.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-fg-muted">No checks yet.</p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-fg-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium sm:px-5">Time</th>
                <th className="px-2 py-2 font-medium">Result</th>
                <th className="px-2 py-2 text-right font-medium">Response</th>
                <th className="px-4 py-2 font-medium max-sm:hidden sm:px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {checks?.map((check) => (
                <tr key={check.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-fg-muted tabular sm:px-5">
                    {formatTime(check.checkedAt)}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-medium',
                        STATUS_META[check.status].text,
                      )}
                    >
                      <StatusDot status={check.status} className="size-2" />
                      {check.statusCode ?? STATUS_META[check.status].label}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap tabular">
                    {formatMs(check.responseMs)}
                  </td>
                  <td
                    className="max-w-64 truncate px-4 py-2 text-fg-muted max-sm:hidden sm:px-5"
                    title={check.message ?? undefined}
                  >
                    {check.message ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function MonitorIncidents({ monitorId }: { monitorId: string }) {
  const now = useNow();
  const { data: incidents } = useQuery(monitorIncidentsQuery(monitorId));

  return (
    <Card className="min-w-0">
      <CardHeader title="Incidents" />
      {!incidents || incidents.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-fg-muted">No incidents. Nice.</p>
      ) : (
        <ol className="max-h-96 divide-y divide-line overflow-auto">
          {incidents.map((incident) => {
            const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
            return (
              <li key={incident.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span
                    className={cn('font-medium', incident.resolvedAt ? 'text-fg' : 'text-down')}
                  >
                    {incident.resolvedAt ? 'Resolved' : 'Ongoing'}
                  </span>
                  <span className="text-xs text-fg-muted tabular">
                    {formatDuration(end - new Date(incident.startedAt).getTime())}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-fg-muted">
                  {incident.cause ?? 'No details'}
                </p>
                <p className="mt-0.5 text-xs text-fg-subtle tabular">
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
      title={`Delete ${monitor.name}?`}
      description="Its check history, uptime stats and incidents are deleted too. This can't be undone. Pausing keeps the history."
    >
      <div className="flex justify-end gap-2 px-5 py-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(monitor.id, {
              onSuccess: () => {
                toast.success(`${monitor.name} deleted`);
                navigate('/admin', { replace: true });
              },
              onError: (error) => toast.error(error.message),
            })
          }
        >
          Delete monitor
        </Button>
      </div>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
