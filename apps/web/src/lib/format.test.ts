import { describe, expect, it } from 'vitest';
import { formatMs, formatUptime, greeting, plural } from './format';
import { timeAgo } from './time';

describe('formatUptime', () => {
  it('never rounds up to a fake 100%', () => {
    expect(formatUptime(0.99996)).toBe('99,99%');
    expect(formatUptime(1)).toBe('100%');
    expect(formatUptime(0.5)).toBe('50,00%');
    expect(formatUptime(null)).toBe('—');
  });
});

describe('formatMs', () => {
  it('switches to seconds above one second', () => {
    expect(formatMs(284.4)).toBe('284 мс');
    expect(formatMs(1234)).toBe('1,23 с');
    expect(formatMs(12_345)).toBe('12,3 с');
  });
});

describe('plural', () => {
  const forms: [string, string, string] = ['монитор', 'монитора', 'мониторов'];
  it.each([
    [1, 'монитор'],
    [3, 'монитора'],
    [5, 'мониторов'],
    [11, 'мониторов'],
    [21, 'монитор'],
    [22, 'монитора'],
  ])('%i → %s', (count, expected) => {
    expect(plural(count, forms)).toBe(expected);
  });
});

describe('greeting', () => {
  it('depends on the time of day', () => {
    expect(greeting(8)).toBe('Доброе утро');
    expect(greeting(14)).toBe('Добрый день');
    expect(greeting(20)).toBe('Добрый вечер');
    expect(greeting(2)).toBe('Доброй ночи');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  it.each([
    ['2026-11-13T11:59:58Z', 'только что'],
    ['2026-11-13T11:59:30Z', '30 с назад'],
    ['2026-11-13T11:45:00Z', '15 мин назад'],
    ['2026-11-13T09:00:00Z', '3 ч назад'],
    ['2026-11-10T12:00:00Z', '3 дн. назад'],
    [null, 'ещё не было'],
  ])('%s → %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
});
