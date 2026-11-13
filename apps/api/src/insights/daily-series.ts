import type { DailyUptimeDto } from '@vigil/shared';
import type { DailyStatsRow } from '../checks/checks.repository.js';

export function toDailyUptime(row: DailyStatsRow): DailyUptimeDto {
  return {
    day: row.day,
    totalChecks: row.totalChecks,
    uptime: row.totalChecks > 0 ? (row.totalChecks - row.downChecks) / row.totalChecks : null,
    avgResponseMs:
      row.responseSamples > 0 ? Math.round(row.responseMsSum / row.responseSamples) : null,
  };
}

export function buildDailySeries(
  monitorIds: string[],
  rows: DailyStatsRow[],
  calendar: string[],
): Map<string, DailyUptimeDto[]> {
  const byKey = new Map(rows.map((row) => [`${row.monitorId}:${row.day}`, row]));

  return new Map(
    monitorIds.map((id) => [
      id,
      calendar.map((day) => {
        const row = byKey.get(`${id}:${day}`);
        return row
          ? toDailyUptime(row)
          : { day, uptime: null, totalChecks: 0, avgResponseMs: null };
      }),
    ]),
  );
}

export function aggregateUptime(days: DailyUptimeDto[]): number | null {
  let total = 0;
  let up = 0;
  for (const day of days) {
    if (day.uptime === null) continue;
    total += day.totalChecks;
    up += day.uptime * day.totalChecks;
  }
  return total > 0 ? up / total : null;
}
