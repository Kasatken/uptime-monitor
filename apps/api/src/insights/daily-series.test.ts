import { describe, expect, it } from 'vitest';
import { aggregateUptime, buildDailySeries } from './daily-series.js';

const row = (monitorId: string, day: string, total: number, down: number) => ({
  monitorId,
  day,
  totalChecks: total,
  downChecks: down,
  responseMsSum: total * 100,
  responseSamples: total,
});

describe('buildDailySeries', () => {
  it('returns one entry per calendar day and fills gaps', () => {
    const calendar = ['2026-11-11', '2026-11-12', '2026-11-13'];
    const series = buildDailySeries(['a'], [row('a', '2026-11-12', 10, 1)], calendar);

    expect(series.get('a')).toEqual([
      { day: '2026-11-11', uptime: null, totalChecks: 0, avgResponseMs: null },
      { day: '2026-11-12', uptime: 0.9, totalChecks: 10, avgResponseMs: 100 },
      { day: '2026-11-13', uptime: null, totalChecks: 0, avgResponseMs: null },
    ]);
  });

  it('includes monitors without any rows', () => {
    const series = buildDailySeries(['a', 'b'], [], ['2026-11-13']);
    expect(series.get('b')).toHaveLength(1);
  });
});

describe('aggregateUptime', () => {
  it('weights days by number of checks', () => {
    const uptime = aggregateUptime([
      { day: '1', uptime: 1, totalChecks: 90, avgResponseMs: null },
      { day: '2', uptime: 0, totalChecks: 10, avgResponseMs: null },
    ]);
    expect(uptime).toBeCloseTo(0.9);
  });

  it('is null without data', () => {
    expect(aggregateUptime([{ day: '1', uptime: null, totalChecks: 0, avgResponseMs: null }])).toBe(
      null,
    );
  });
});
