import { Injectable } from '@nestjs/common';
import type { DailyUptimeDto, MonitorStatsDto, MonitorSummaryDto } from '@vigil/shared';
import { ChecksRepository } from '../checks/checks.repository.js';
import { hoursAgo, lastUtcDays } from '../common/time.js';
import type { MonitorRecord } from '../database/schema.js';
import { toMonitorDto } from '../monitors/monitor.mapper.js';
import { aggregateUptime, buildDailySeries } from './daily-series.js';

const SPARKLINE_POINTS = 40;
export const HISTORY_DAYS = 90;

@Injectable()
export class StatsService {
  constructor(private readonly checks: ChecksRepository) {}

  async summarize(monitors: MonitorRecord[]): Promise<MonitorSummaryDto[]> {
    const ids = monitors.map((monitor) => monitor.id);
    const [points, uptime] = await Promise.all([
      this.checks.recentPoints(ids, SPARKLINE_POINTS),
      this.checks.uptimeSince(ids, hoursAgo(24)),
    ]);

    return monitors.map((monitor) => ({
      ...toMonitorDto(monitor),
      uptime24h: uptime.get(monitor.id) ?? null,
      recentChecks: points.get(monitor.id) ?? [],
    }));
  }

  async forMonitor(monitorId: string): Promise<MonitorStatsDto> {
    const since = hoursAgo(24);
    const [uptime24h, response, series] = await Promise.all([
      this.checks.uptimeSince([monitorId], since),
      this.checks.responseStatsSince(monitorId, since),
      this.dailySeries([monitorId], HISTORY_DAYS),
    ]);
    const days = series.get(monitorId) ?? [];

    return {
      uptime: {
        '24h': uptime24h.get(monitorId) ?? null,
        '7d': aggregateUptime(days.slice(-7)),
        '30d': aggregateUptime(days.slice(-30)),
        '90d': aggregateUptime(days),
      },
      avgResponseMs24h: response.avg,
      p95ResponseMs24h: response.p95,
      days,
    };
  }

  async dailySeries(monitorIds: string[], days: number): Promise<Map<string, DailyUptimeDto[]>> {
    const calendar = lastUtcDays(days);
    const rows = await this.checks.dailyStats(monitorIds, calendar[0] as string);
    return buildDailySeries(monitorIds, rows, calendar);
  }
}
