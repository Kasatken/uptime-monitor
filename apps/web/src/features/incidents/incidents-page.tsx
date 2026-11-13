import { useQuery } from '@tanstack/react-query';
import { formatDuration } from '@vigil/shared';
import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowBadge } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/card';
import { Segmented } from '../../components/ui/segmented';
import { cn } from '../../lib/cn';
import { formatDateTime, timeAgo, useNow } from '../../lib/time';
import { type IncidentFilter, incidentsQuery } from './incidents.api';

export function IncidentsPage() {
  const now = useNow();
  const [filter, setFilter] = useState<IncidentFilter>('all');
  const { data: incidents, isPending } = useQuery(incidentsQuery(filter));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-medium text-fg-muted">История сбоев</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Инциденты
          </h1>
        </div>
        <Segmented
          label="Фильтр инцидентов"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'open', label: 'Продолжаются' },
            { value: 'resolved', label: 'Устранены' },
          ]}
        />
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : incidents?.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-lime px-6 py-16 text-center text-on-color">
          <span className="grid size-14 place-items-center rounded-full bg-white/55">
            <CircleCheck className="size-7" aria-hidden />
          </span>
          <p className="font-display text-2xl font-semibold">
            {filter === 'open' ? 'Сейчас всё работает' : 'Сбоев ещё не было'}
          </p>
          <p className="text-sm opacity-70">Когда монитор упадёт, инцидент появится здесь сам.</p>
        </div>
      ) : (
        <ol className="grid gap-4 md:grid-cols-2">
          {incidents?.map((incident) => {
            const ongoing = incident.resolvedAt === null;
            const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
            return (
              <li key={incident.id}>
                <Link
                  to={`/admin/monitors/${incident.monitorId}`}
                  className={cn(
                    'group flex h-full flex-col gap-4 rounded-card p-5 transition hover:-translate-y-0.5',
                    ongoing ? 'bg-tomato text-on-color' : 'bg-surface shadow-card',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{incident.monitorName}</p>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-sm',
                          ongoing ? 'opacity-80' : 'text-fg-muted',
                        )}
                      >
                        {incident.cause ?? 'Без подробностей'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                        ongoing ? 'bg-white/55' : 'bg-lime text-on-color',
                      )}
                    >
                      {ongoing ? 'Продолжается' : 'Устранён'}
                    </span>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <p className="font-display text-3xl font-semibold tracking-tight tabular">
                        {formatDuration(end - new Date(incident.startedAt).getTime())}
                      </p>
                      <p
                        className={cn('text-xs', ongoing ? 'opacity-70' : 'text-fg-muted')}
                        title={formatDateTime(incident.startedAt)}
                      >
                        начался {timeAgo(incident.startedAt, now)}
                      </p>
                    </div>
                    <ArrowBadge onColor={ongoing} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
