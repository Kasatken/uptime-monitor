import { describe, expect, it } from 'vitest';
import { matchesStatusSpec } from './http-status.js';

describe('matchesStatusSpec', () => {
  it.each([
    [200, '200-299', true],
    [299, '200-299', true],
    [301, '200-299', false],
    [301, '200, 301', true],
    [418, '200-204, 418', true],
    [500, '200 - 299', false],
    [204, ' 200 - 299 ', true],
  ])('%i in "%s" → %s', (status, spec, expected) => {
    expect(matchesStatusSpec(status, spec)).toBe(expected);
  });
});
