import type { MonitorDto } from './monitor.js';

export const CHECK_STATUSES = ['up', 'degraded', 'down'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export interface CheckDto {
  id: number;
  monitorId: string;
  status: CheckStatus;
  responseMs: number | null;
  statusCode: number | null;
  message: string | null;
  checkedAt: string;
}

/** Lightweight shape for sparklines and charts. */
export type CheckPointDto = Pick<CheckDto, 'status' | 'responseMs' | 'checkedAt'>;

export type MonitorSummaryDto = MonitorDto & {
  /** 0..1, null when there is no data yet */
  uptime24h: number | null;
  recentChecks: CheckPointDto[];
};

export interface DailyUptimeDto {
  /** YYYY-MM-DD, UTC */
  day: string;
  /** 0..1, null when there were no checks that day */
  uptime: number | null;
  totalChecks: number;
  avgResponseMs: number | null;
}

export const UPTIME_WINDOWS = ['24h', '7d', '30d', '90d'] as const;
export type UptimeWindow = (typeof UPTIME_WINDOWS)[number];

export interface MonitorStatsDto {
  uptime: Record<UptimeWindow, number | null>;
  avgResponseMs24h: number | null;
  p95ResponseMs24h: number | null;
  days: DailyUptimeDto[];
}
