import { describe, expect, it } from 'vitest';
import { nextMonitorState } from './monitor-state.js';

describe('nextMonitorState', () => {
  it('goes up after the first successful check', () => {
    const next = nextMonitorState({ status: 'pending', failStreak: 0 }, 'up', 2);
    expect(next).toMatchObject({ status: 'up', failStreak: 0, changed: true });
  });

  it('ignores a single failure below the threshold', () => {
    const next = nextMonitorState({ status: 'up', failStreak: 0 }, 'down', 2);
    expect(next).toMatchObject({ status: 'up', failStreak: 1, changed: false });
  });

  it('goes down once failures reach the threshold', () => {
    const next = nextMonitorState({ status: 'up', failStreak: 1 }, 'down', 2);
    expect(next).toMatchObject({
      status: 'down',
      failStreak: 2,
      previousStatus: 'up',
      changed: true,
    });
  });

  it('stays down without reporting a new change', () => {
    const next = nextMonitorState({ status: 'down', failStreak: 5 }, 'down', 2);
    expect(next).toMatchObject({ status: 'down', failStreak: 6, changed: false });
  });

  it('recovers on the first good check and resets the streak', () => {
    const next = nextMonitorState({ status: 'down', failStreak: 4 }, 'degraded', 3);
    expect(next).toMatchObject({ status: 'degraded', failStreak: 0, changed: true });
  });

  it('with threshold 1 any failure is an outage', () => {
    const next = nextMonitorState({ status: 'up', failStreak: 0 }, 'down', 1);
    expect(next.status).toBe('down');
  });
});
