import { queryOptions } from '@tanstack/react-query';
import type { IncidentDto } from '@vigil/shared';
import { api } from '../../lib/api-client';

export type IncidentFilter = 'all' | 'open' | 'resolved';

export const incidentKeys = {
  all: ['incidents'] as const,
  list: (filter: IncidentFilter) => ['incidents', 'list', filter] as const,
  forMonitor: (monitorId: string) => ['incidents', 'monitor', monitorId] as const,
};

export const incidentsQuery = (filter: IncidentFilter) =>
  queryOptions({
    queryKey: incidentKeys.list(filter),
    queryFn: () => api<IncidentDto[]>(`/incidents?filter=${filter}`),
  });

export const monitorIncidentsQuery = (monitorId: string) =>
  queryOptions({
    queryKey: incidentKeys.forMonitor(monitorId),
    queryFn: () => api<IncidentDto[]>(`/monitors/${monitorId}/incidents`),
  });
