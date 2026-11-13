import { useQuery } from '@tanstack/react-query';
import { formatDuration } from '@vigil/shared';
import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { StatusDot } from '../../components/status';
import { Card, Skeleton } from '../../components/ui/card';
import { Segmented } from '../../components/ui/segmented';
import { cn } from '../../lib/cn';
import { formatDateTime, timeAgo, useNow } from '../../lib/time';
import { type IncidentFilter, incidentsQuery } from './incidents.api';

export function IncidentsPage() {
  const now = useNow();
  const [filter, setFilter] = useState<IncidentFilter>('all');
  const { data: incidents, isPending } = useQuery(incidentsQuery(filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Opened when a monitor goes down, closed when it recovers.
          </p>
        </div>
        <Segmented
          label="Filter incidents"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Ongoing' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
      </div>

      <Card>
        {isPending ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : incidents?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <CircleCheck className="size-8 text-up" aria-hidden />
            <p className="font-medium">
              {filter === 'open' ? 'Nothing is down right now' : 'No incidents yet'}
            </p>
            <p className="text-sm text-fg-muted">
              When a monitor fails, the incident shows up here.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-line">
            {incidents?.map((incident) => {
              const ongoing = incident.resolvedAt === null;
              const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
              return (
                <li key={incident.id}>
                  <Link
                    to={`/admin/monitors/${incident.monitorId}`}
                    className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 px-4 py-3.5 hover:bg-surface-muted/60 sm:px-5"
                  >
                    <StatusDot status={ongoing ? 'down' : 'up'} className="mt-1.5" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {incident.monitorName}
                        <span
                          className={cn(
                            'ml-2 text-xs font-medium',
                            ongoing ? 'text-down' : 'text-fg-muted',
                          )}
                        >
                          {ongoing ? 'Ongoing' : 'Resolved'}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-sm text-fg-muted">
                        {incident.cause ?? 'No details'}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular">
                      <div className={cn('font-medium', ongoing ? 'text-down' : 'text-fg')}>
                        {formatDuration(end - new Date(incident.startedAt).getTime())}
                      </div>
                      <div className="text-fg-subtle" title={formatDateTime(incident.startedAt)}>
                        {timeAgo(incident.startedAt, now)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
