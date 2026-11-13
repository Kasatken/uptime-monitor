import { useQueryClient } from '@tanstack/react-query';
import { type CheckDto, type CheckPointDto, formatDuration } from '@vigil/shared';
import { toast } from 'sonner';
import { useLiveEvent } from '../../live/live-provider';
import { incidentKeys } from '../incidents/incidents.api';
import {
  checksQuery,
  monitorKeys,
  monitorQuery,
  overviewQuery,
  RECENT_CHECKS,
  SPARKLINE_POINTS,
  storeMonitor,
} from '../monitors/monitors.api';

const toPoint = ({ status, responseMs, checkedAt }: CheckDto): CheckPointDto => ({
  status,
  responseMs,
  checkedAt,
});

export function useAdminLiveSync() {
  const queryClient = useQueryClient();

  useLiveEvent('monitor:checked', ({ monitor, check }) => {
    queryClient.setQueryData(monitorQuery(monitor.id).queryKey, monitor);

    queryClient.setQueryData(overviewQuery.queryKey, (list) =>
      list?.map((item) =>
        item.id === monitor.id
          ? {
              ...item,
              ...monitor,
              recentChecks: [...item.recentChecks, toPoint(check)].slice(-SPARKLINE_POINTS),
            }
          : item,
      ),
    );

    queryClient.setQueryData(checksQuery(monitor.id).queryKey, (checks) =>
      checks ? [check, ...checks].slice(0, RECENT_CHECKS) : checks,
    );

    queryClient.setQueriesData<CheckPointDto[]>(
      { queryKey: ['monitors', monitor.id, 'response-times'] },
      (points) => (points ? [...points, toPoint(check)] : points),
    );

    void queryClient.invalidateQueries({ queryKey: monitorKeys.stats(monitor.id) });
  });

  useLiveEvent('monitor:saved', (monitor) => storeMonitor(queryClient, monitor));

  useLiveEvent('monitor:removed', ({ id }) => {
    queryClient.setQueryData(overviewQuery.queryKey, (list) => list?.filter((m) => m.id !== id));
    queryClient.removeQueries({ queryKey: monitorKeys.detail(id) });
  });

  useLiveEvent('incident:opened', (incident) => {
    toast.error(`${incident.monitorName} не работает`, {
      description: incident.cause ?? undefined,
    });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
  });

  useLiveEvent('incident:resolved', (incident) => {
    const downtime = incident.resolvedAt
      ? new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()
      : 0;
    toast.success(`${incident.monitorName} снова работает`, {
      description: `Простой: ${formatDuration(downtime)}`,
    });
    void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
  });
}
