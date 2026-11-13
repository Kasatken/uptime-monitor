import type { StatusPageDto } from '@vigil/shared';
import { describe, expect, it } from 'vitest';
import { applyPublicCheck } from './status-page.api';

const page: StatusPageDto = {
  title: 'Status',
  overall: 'operational',
  generatedAt: '2026-11-13T10:00:00Z',
  incidents: [],
  monitors: [
    {
      id: 'a',
      name: 'Website',
      status: 'up',
      uptime90d: 1,
      lastResponseMs: 200,
      lastCheckedAt: '2026-11-13T10:00:00Z',
      days: [
        { day: '2026-11-12', uptime: 1, totalChecks: 10, avgResponseMs: 200 },
        { day: '2026-11-13', uptime: 1, totalChecks: 3, avgResponseMs: 200 },
      ],
    },
    {
      id: 'b',
      name: 'API',
      status: 'up',
      uptime90d: 1,
      lastResponseMs: 100,
      lastCheckedAt: '2026-11-13T10:00:00Z',
      days: [],
    },
  ],
};

describe('applyPublicCheck', () => {
  const next = applyPublicCheck(page, {
    monitorId: 'a',
    status: 'down',
    monitorStatus: 'down',
    responseMs: null,
    checkedAt: '2026-11-13T10:01:00Z',
  });

  it('updates the monitor and recomputes the banner', () => {
    expect(next.monitors[0]).toMatchObject({ status: 'down', lastResponseMs: null });
    expect(next.overall).toBe('partial_outage');
  });

  it("adds the check to today's bar", () => {
    expect(next.monitors[0]?.days.at(-1)).toMatchObject({ totalChecks: 4, uptime: 0.75 });
    expect(next.monitors[0]?.days[0]).toEqual(page.monitors[0]?.days[0]);
  });

  it('leaves other monitors untouched', () => {
    expect(next.monitors[1]).toBe(page.monitors[1]);
  });
});
