import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { computeOverallStatus, type PublicCheckEvent, type StatusPageDto } from '@vigil/shared';
import { api } from '../../lib/api-client';
import { useLiveEvent } from '../../live/live-provider';

export const statusPageQuery = queryOptions({
  queryKey: ['status-page'],
  queryFn: () => api<StatusPageDto>('/status'),
});

/** Applies one live check to the cached page: status, latency and today's bar. */
export function applyPublicCheck(page: StatusPageDto, event: PublicCheckEvent): StatusPageDto {
  const monitors = page.monitors.map((monitor) => {
    if (monitor.id !== event.monitorId) return monitor;

    const days = [...monitor.days];
    const today = days.at(-1);
    if (today && event.checkedAt.startsWith(today.day)) {
      const upBefore = (today.uptime ?? 0) * today.totalChecks;
      const totalChecks = today.totalChecks + 1;
      const up = upBefore + (event.status === 'down' ? 0 : 1);
      days[days.length - 1] = { ...today, totalChecks, uptime: up / totalChecks };
    }

    return {
      ...monitor,
      status: event.monitorStatus,
      lastResponseMs: event.responseMs,
      lastCheckedAt: event.checkedAt,
      days,
    };
  });

  return { ...page, monitors, overall: computeOverallStatus(monitors.map((m) => m.status)) };
}

export function useStatusPageLiveSync() {
  const queryClient = useQueryClient();

  useLiveEvent('status:checked', (event) => {
    queryClient.setQueryData(statusPageQuery.queryKey, (page) =>
      page ? applyPublicCheck(page, event) : page,
    );
  });

  useLiveEvent('status:invalidated', () => {
    void queryClient.invalidateQueries({ queryKey: statusPageQuery.queryKey });
  });
}
