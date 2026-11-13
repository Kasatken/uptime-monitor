import { type QueryClient, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CheckDto,
  CheckPointDto,
  CreateMonitorInput,
  MonitorDto,
  MonitorStatsDto,
  MonitorSummaryDto,
  UpdateMonitorInput,
} from '@vigil/shared';
import { api } from '../../lib/api-client';

/** All cache keys in one place, so live updates and mutations hit the same entries. */
export const monitorKeys = {
  overview: ['monitors', 'overview'] as const,
  detail: (id: string) => ['monitors', id] as const,
  checks: (id: string) => ['monitors', id, 'checks'] as const,
  responseTimes: (id: string, hours: number) => ['monitors', id, 'response-times', hours] as const,
  stats: (id: string) => ['monitors', id, 'stats'] as const,
};

export const SPARKLINE_POINTS = 40;
export const RECENT_CHECKS = 50;

export const overviewQuery = queryOptions({
  queryKey: monitorKeys.overview,
  queryFn: () => api<MonitorSummaryDto[]>('/overview'),
});

export const monitorQuery = (id: string) =>
  queryOptions({
    queryKey: monitorKeys.detail(id),
    queryFn: () => api<MonitorDto>(`/monitors/${id}`),
  });

export const checksQuery = (id: string) =>
  queryOptions({
    queryKey: monitorKeys.checks(id),
    queryFn: () => api<CheckDto[]>(`/monitors/${id}/checks?limit=${RECENT_CHECKS}`),
  });

export const responseTimesQuery = (id: string, hours: number) =>
  queryOptions({
    queryKey: monitorKeys.responseTimes(id, hours),
    queryFn: () => api<CheckPointDto[]>(`/monitors/${id}/response-times?hours=${hours}`),
  });

export const statsQuery = (id: string) =>
  queryOptions({
    queryKey: monitorKeys.stats(id),
    queryFn: () => api<MonitorStatsDto>(`/monitors/${id}/stats`),
  });

/** Writes a fresh monitor into every cache entry that shows it. */
export function storeMonitor(queryClient: QueryClient, monitor: MonitorDto) {
  queryClient.setQueryData(monitorQuery(monitor.id).queryKey, monitor);
  queryClient.setQueryData(overviewQuery.queryKey, (list) => {
    if (!list) return list;
    const exists = list.some((m) => m.id === monitor.id);
    return exists
      ? list.map((m) => (m.id === monitor.id ? { ...m, ...monitor } : m))
      : [...list, { ...monitor, uptime24h: null, recentChecks: [] }];
  });
}

function useStoreMonitor() {
  const queryClient = useQueryClient();
  return (monitor: MonitorDto) => storeMonitor(queryClient, monitor);
}

export function useCreateMonitor() {
  const store = useStoreMonitor();
  return useMutation({
    mutationFn: (input: CreateMonitorInput) =>
      api<MonitorDto>('/monitors', { method: 'POST', json: input }),
    onSuccess: store,
  });
}

export function useUpdateMonitor(id: string) {
  const store = useStoreMonitor();
  return useMutation({
    mutationFn: (input: UpdateMonitorInput) =>
      api<MonitorDto>(`/monitors/${id}`, { method: 'PATCH', json: input }),
    onSuccess: store,
  });
}

export function useTogglePause(monitor: MonitorDto) {
  const store = useStoreMonitor();
  const action = monitor.status === 'paused' ? 'resume' : 'pause';
  return useMutation({
    mutationFn: () => api<MonitorDto>(`/monitors/${monitor.id}/${action}`, { method: 'POST' }),
    onSuccess: store,
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/monitors/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.setQueryData(overviewQuery.queryKey, (list) => list?.filter((m) => m.id !== id));
      queryClient.removeQueries({ queryKey: monitorKeys.detail(id) });
    },
  });
}

export function useRunCheck(id: string) {
  return useMutation({
    mutationFn: () => api<CheckDto | null>(`/monitors/${id}/check`, { method: 'POST' }),
    // the result itself arrives through the live socket and updates the caches
  });
}
