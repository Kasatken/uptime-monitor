import { describe, expect, it } from 'vitest';
import { formatMs, formatUptime } from './format';
import { timeAgo } from './time';

describe('formatUptime', () => {
  it('never rounds up to a fake 100%', () => {
    expect(formatUptime(0.99996)).toBe('99.99%');
    expect(formatUptime(1)).toBe('100%');
    expect(formatUptime(0.5)).toBe('50.00%');
    expect(formatUptime(null)).toBe('—');
  });
});

describe('formatMs', () => {
  it('switches to seconds above one second', () => {
    expect(formatMs(284.4)).toBe('284 ms');
    expect(formatMs(1234)).toBe('1.23 s');
    expect(formatMs(12_345)).toBe('12.3 s');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  it.each([
    ['2026-11-13T11:59:58Z', 'just now'],
    ['2026-11-13T11:59:30Z', '30s ago'],
    ['2026-11-13T11:45:00Z', '15m ago'],
    ['2026-11-13T09:00:00Z', '3h ago'],
    ['2026-11-10T12:00:00Z', '3d ago'],
  ])('%s → %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
});
