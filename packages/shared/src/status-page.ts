import type { DailyUptimeDto } from './check.js';
import type { PublicIncidentDto } from './incident.js';
import type { MonitorStatus } from './monitor.js';

export type OverallStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'unknown';

export interface StatusPageMonitorDto {
  id: string;
  name: string;
  status: MonitorStatus;
  uptime90d: number | null;
  lastResponseMs: number | null;
  lastCheckedAt: string | null;
  days: DailyUptimeDto[];
}

export interface StatusPageDto {
  title: string;
  overall: OverallStatus;
  monitors: StatusPageMonitorDto[];
  incidents: PublicIncidentDto[];
  generatedAt: string;
}

/**
 * One rule for both server and client, so the banner never disagrees with the list.
 * Paused and pending monitors don't affect the overall status.
 */
export function computeOverallStatus(statuses: readonly MonitorStatus[]): OverallStatus {
  const active = statuses.filter((s) => s !== 'paused' && s !== 'pending');
  if (active.length === 0) return 'unknown';

  const down = active.filter((s) => s === 'down').length;
  if (down === active.length) return 'major_outage';
  if (down > 0) return 'partial_outage';
  if (active.includes('degraded')) return 'degraded';
  return 'operational';
}
