import { describe, expect, it } from 'vitest';
import { computeOverallStatus } from './status-page.js';

describe('computeOverallStatus', () => {
  it('is unknown when nothing is actively monitored', () => {
    expect(computeOverallStatus([])).toBe('unknown');
    expect(computeOverallStatus(['paused', 'pending'])).toBe('unknown');
  });

  it('is operational when every active monitor is up', () => {
    expect(computeOverallStatus(['up', 'up', 'paused'])).toBe('operational');
  });

  it('reports degraded before partial outage', () => {
    expect(computeOverallStatus(['up', 'degraded'])).toBe('degraded');
  });

  it('distinguishes partial and major outage', () => {
    expect(computeOverallStatus(['up', 'down'])).toBe('partial_outage');
    expect(computeOverallStatus(['down', 'down', 'paused'])).toBe('major_outage');
  });
});
