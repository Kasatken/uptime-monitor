import { describe, expect, it } from 'vitest';
import { linear, nearestIndex, niceCeil } from './scale';

describe('niceCeil', () => {
  it.each([
    [0, 1],
    [7, 10],
    [180, 200],
    [230, 250],
    [420, 500],
    [1300, 2000],
  ])('%i → %i', (input, expected) => expect(niceCeil(input)).toBe(expected));
});

describe('linear', () => {
  it('maps a domain onto a range', () => {
    const y = linear([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
  });
});

describe('nearestIndex', () => {
  it('finds the closest x', () => {
    const xs = [0, 10, 20, 30];
    expect(nearestIndex(xs, 14)).toBe(1);
    expect(nearestIndex(xs, 16)).toBe(2);
    expect(nearestIndex(xs, 100)).toBe(3);
    expect(nearestIndex([5], 0)).toBe(0);
  });
});
