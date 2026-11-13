import { describe, expect, it } from 'vitest';
import { formatDuration, formatInterval } from './format.js';

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [999, '1s'],
    [75_000, '1m 15s'],
    [3_600_000, '1h'],
    [93_784_000, '1d 2h'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatInterval', () => {
  it('picks the largest whole unit', () => {
    expect(formatInterval(30)).toBe('30s');
    expect(formatInterval(300)).toBe('5m');
    expect(formatInterval(7200)).toBe('2h');
    expect(formatInterval(90)).toBe('90s');
  });
});
