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
import { OVERALL_META, STATUS_META, StatusDot } from '../../components/status';
import { ThemeToggle } from '../../components/theme-toggle';
import { Button } from '../../components/ui/button';
import { Card, Skeleton } from '../../components/ui/card';
import { cn } from '../../lib/cn';
import { formatUptime } from '../../lib/format';
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
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-8 pb-6 sm:pt-12">
        <div className="flex items-center gap-3">
          <Logo withText={false} />
          <h1 className="text-lg font-semibold tracking-tight">{page?.title ?? 'Status'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <LiveIndicator />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 pb-16">
        {isPending && <StatusPageSkeleton />}

        {isError && (
          <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="font-medium">Couldn't load the status page</p>
            <p className="text-sm text-fg-muted">This doesn't necessarily mean anything is down.</p>
            <Button onClick={() => void refetch()}>
              <RefreshCw /> Try again
            </Button>
          </Card>
        )}

        {page && (
          <>
            <OverallBanner overall={page.overall} monitors={page.monitors} />

            <section aria-labelledby="services-heading">
              <h2 id="services-heading" className="mb-3 text-sm font-medium text-fg-muted">
                Services
              </h2>
              {page.monitors.length === 0 ? (
                <Card className="px-6 py-10 text-center text-sm text-fg-muted">
                  No public services yet.
                </Card>
              ) : (
                <Card className="divide-y divide-line">
                  {page.monitors.map((monitor) => (
                    <ServiceRow key={monitor.id} monitor={monitor} />
                  ))}
                </Card>
              )}
            </section>

            <IncidentHistory incidents={page.incidents} />
          </>
        )}
      </main>

      <footer className="mx-auto flex max-w-3xl flex-wrap justify-between gap-2 border-t border-line px-4 py-6 text-xs text-fg-subtle">
        <span>Uptime is calculated per UTC day.</span>
        <Link to="/admin" className="hover:text-fg">
          Powered by Vigil
        </Link>
      </footer>
    </div>
  );
}

function OverallBanner({
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

  return (
    <Card className={cn('flex items-center gap-4 overflow-hidden px-5 py-5 sm:px-6', 'relative')}>
      <span className={cn('absolute inset-y-0 left-0 w-1', status.dot)} aria-hidden />
      <status.Icon className={cn('size-8 shrink-0', status.text)} aria-hidden />
      <div>
        <p className="text-lg font-semibold tracking-tight">{meta.title}</p>
        <p className="text-sm text-fg-muted">
          {lastCheck ? `Last checked ${timeAgo(lastCheck, now)}` : 'Waiting for the first checks'}
        </p>
      </div>
    </Card>
  );
}

function ServiceRow({ monitor }: { monitor: StatusPageMonitorDto }) {
  const meta = STATUS_META[monitor.status];
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot status={monitor.status} />
          <span className="truncate font-medium">{monitor.name}</span>
          <span className={cn('text-xs font-medium', meta.text)}>{meta.label}</span>
        </div>
        <span className="shrink-0 text-sm text-fg-muted tabular">
          <span className="text-fg">{formatUptime(monitor.uptime90d)}</span>
          <span className="max-sm:hidden"> uptime</span>
        </span>
      </div>
      <UptimeBars
        days={monitor.days}
        label={`${monitor.name}, ${formatUptime(monitor.uptime90d)} uptime over 90 days`}
      />
      <UptimeBarsLegend days={monitor.days.length} />
    </div>
  );
}

function IncidentHistory({ incidents }: { incidents: PublicIncidentDto[] }) {
  const now = useNow();

  return (
    <section aria-labelledby="incidents-heading">
      <h2 id="incidents-heading" className="mb-3 text-sm font-medium text-fg-muted">
        Past 14 days
      </h2>
      {incidents.length === 0 ? (
        <Card className="flex items-center gap-3 px-5 py-4 text-sm text-fg-muted">
          <CircleCheck className="size-5 text-up" aria-hidden />
          No incidents reported.
        </Card>
      ) : (
        <Card>
          <ol className="divide-y divide-line">
            {incidents.map((incident) => {
              const ongoing = incident.resolvedAt === null;
              const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
              const duration = formatDuration(end - new Date(incident.startedAt).getTime());
              return (
                <li key={incident.id} className="flex items-start gap-3 px-5 py-4">
                  <StatusDot status={ongoing ? 'down' : 'up'} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {incident.monitorName} {ongoing ? 'is unavailable' : 'was unavailable'}
                    </p>
                    <p className="mt-0.5 text-sm text-fg-muted">
                      {ongoing ? `Ongoing for ${duration}` : `Resolved · lasted ${duration}`}
                    </p>
                  </div>
                  <time
                    dateTime={incident.startedAt}
                    className="shrink-0 text-xs text-fg-subtle tabular"
                  >
                    {formatDateTime(incident.startedAt)}
                  </time>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </section>
  );
}

function StatusPageSkeleton() {
  return (
    <div className="space-y-10" aria-busy>
      <Skeleton className="h-20 rounded-xl" />
      <Card className="space-y-6 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8" />
          </div>
        ))}
      </Card>
    </div>
  );
}
