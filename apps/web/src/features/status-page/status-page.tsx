import { useQuery } from '@tanstack/react-query';
import {
  formatDuration,
  type OverallStatus,
  type PublicIncidentDto,
  type StatusPageMonitorDto,
} from '@vigil/shared';
import { CircleCheck, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { UptimeBars, UptimeBarsLegend } from '../../components/charts/uptime-bars';
import { LiveIndicator } from '../../components/live-indicator';
import { Logo } from '../../components/logo';
import { OVERALL_META, STATUS_META, StatusChip } from '../../components/status';
import { ThemeToggle } from '../../components/theme-toggle';
import { Button } from '../../components/ui/button';
import { Card, Chip, Skeleton } from '../../components/ui/card';
import { cn } from '../../lib/cn';
import { formatUptime, plural } from '../../lib/format';
import { formatDateTime, timeAgo, useNow } from '../../lib/time';
import { statusPageQuery, useStatusPageLiveSync } from './status-page.api';

export function StatusPage() {
  const { data: page, isPending, isError, refetch } = useQuery(statusPageQuery);
  useStatusPageLiveSync();

  useEffect(() => {
    if (!page) return;
    const problem = page.overall === 'partial_outage' || page.overall === 'major_outage';
    document.title = `${problem ? '⚠ ' : ''}${page.title}`;
  }, [page]);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-6 pb-6 sm:pt-10">
        <div className="flex min-w-0 items-center gap-3">
          <Logo withText={false} />
          <h1 className="truncate font-display text-lg font-semibold tracking-tight">
            {page?.title ?? 'Статус сервисов'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LiveIndicator />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-16">
        {isPending && <StatusPageSkeleton />}

        {isError && (
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-lg font-bold">Не удалось загрузить страницу</p>
            <p className="text-sm text-fg-muted">Это не значит, что сервисы не работают.</p>
            <Button variant="primary" onClick={() => void refetch()}>
              <RefreshCw /> Попробовать ещё раз
            </Button>
          </Card>
        )}

        {page && (
          <>
            <OverallHero overall={page.overall} monitors={page.monitors} />

            <section aria-labelledby="services-heading" className="space-y-3">
              <h2 id="services-heading" className="px-1 text-lg font-bold">
                Сервисы
              </h2>
              {page.monitors.length === 0 ? (
                <Card className="px-6 py-10 text-center text-fg-muted">
                  Публичных сервисов пока нет.
                </Card>
              ) : (
                page.monitors.map((monitor) => <ServiceCard key={monitor.id} monitor={monitor} />)
              )}
            </section>

            <IncidentHistory incidents={page.incidents} />
          </>
        )}
      </main>

      <footer className="mx-auto flex max-w-3xl flex-wrap justify-between gap-2 px-5 pb-10 text-xs text-fg-subtle">
        <span>Аптайм считается по дням в UTC.</span>
        <Link to="/admin" className="hover:text-fg">
          Работает на Vigil
        </Link>
      </footer>
    </div>
  );
}

function OverallHero({
  overall,
  monitors,
}: {
  overall: OverallStatus;
  monitors: StatusPageMonitorDto[];
}) {
  const now = useNow();
  const meta = OVERALL_META[overall];
  const status = STATUS_META[meta.status];
  const lastCheck = monitors
    .map((m) => m.lastCheckedAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);
  const problems = monitors.filter((m) => m.status === 'down' || m.status === 'degraded').length;

  return (
    <section className={cn('rounded-card p-6 sm:p-8', status.fill)}>
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-white/55">
          <status.Icon className="size-7" aria-hidden />
        </span>
        <span className="text-right text-sm font-medium opacity-70">
          {lastCheck ? `Обновлено ${timeAgo(lastCheck, now)}` : 'Ждём первые проверки'}
        </span>
      </div>
      <p className="mt-8 max-w-xl font-display text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
        {meta.title}
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Chip className="bg-white/55 text-on-color">
          {monitors.length} {plural(monitors.length, ['сервис', 'сервиса', 'сервисов'])}
        </Chip>
        {problems > 0 && (
          <Chip className="bg-night text-white">
            {problems} с {plural(problems, ['проблемой', 'проблемами', 'проблемами'])}
          </Chip>
        )}
      </div>
    </section>
  );
}

function ServiceCard({ monitor }: { monitor: StatusPageMonitorDto }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="truncate text-lg font-bold">{monitor.name}</p>
          <StatusChip status={monitor.status} />
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl font-semibold tracking-tight tabular sm:text-3xl">
            {formatUptime(monitor.uptime90d)}
          </p>
          <p className="text-xs text-fg-muted">аптайм за 90 дней</p>
        </div>
      </div>
      <UptimeBars
        days={monitor.days}
        label={`${monitor.name}: аптайм ${formatUptime(monitor.uptime90d)} за 90 дней`}
      />
      <UptimeBarsLegend days={monitor.days.length} />
    </Card>
  );
}

function IncidentHistory({ incidents }: { incidents: PublicIncidentDto[] }) {
  const now = useNow();

  return (
    <section aria-labelledby="incidents-heading" className="space-y-3">
      <h2 id="incidents-heading" className="px-1 text-lg font-bold">
        Последние 14 дней
      </h2>
      {incidents.length === 0 ? (
        <Card className="flex items-center gap-3 px-6 py-5">
          <span className="grid size-10 place-items-center rounded-full bg-lime text-on-color">
            <CircleCheck className="size-5" aria-hidden />
          </span>
          <span className="font-medium">Сбоев не было</span>
        </Card>
      ) : (
        <ol className="space-y-3">
          {incidents.map((incident) => {
            const ongoing = incident.resolvedAt === null;
            const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
            const duration = formatDuration(end - new Date(incident.startedAt).getTime());
            return (
              <li
                key={incident.id}
                className={cn(
                  'flex items-start justify-between gap-4 rounded-card px-6 py-5',
                  ongoing ? 'bg-tomato text-on-color' : 'bg-surface shadow-card',
                )}
              >
                <div className="min-w-0">
                  <p className="font-bold">Сбой: {incident.monitorName}</p>
                  <p className={cn('mt-1 text-sm', ongoing ? 'opacity-75' : 'text-fg-muted')}>
                    {ongoing ? `Продолжается ${duration}` : `Устранён · длился ${duration}`}
                  </p>
                </div>
                <time
                  dateTime={incident.startedAt}
                  className={cn(
                    'shrink-0 text-xs tabular',
                    ongoing ? 'opacity-75' : 'text-fg-subtle',
                  )}
                >
                  {formatDateTime(incident.startedAt)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function StatusPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-64 rounded-card" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-36 rounded-card" />
      ))}
    </div>
  );
}
