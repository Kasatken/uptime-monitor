import { describe, expect, it } from 'vitest';
import { cronFor } from './heartbeat-snippet';

describe('cronFor', () => {
  it.each([
    [300, '*/5 * * * *'],
    [3600, '0 * * * *'],
    [21_600, '0 */6 * * *'],
    [86_400, '0 3 * * *'],
  ])('%i s → %s', (seconds, expected) => {
    expect(cronFor(seconds)).toBe(expected);
  });
});
