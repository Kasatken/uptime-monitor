import { describe, expect, it } from 'vitest';
import { formatDuration, formatInterval } from './format.js';

describe('formatDuration', () => {
  it.each([
    [0, '0 с'],
    [999, '1 с'],
    [75_000, '1 мин 15 с'],
    [3_600_000, '1 ч'],
    [93_784_000, '1 д 2 ч'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatInterval', () => {
  it('picks the largest whole unit', () => {
    expect(formatInterval(30)).toBe('30 с');
    expect(formatInterval(300)).toBe('5 мин');
    expect(formatInterval(7200)).toBe('2 ч');
    expect(formatInterval(90)).toBe('90 с');
  });
});
