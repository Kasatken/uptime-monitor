const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export const hoursAgo = (hours: number, now = new Date()) =>
  new Date(now.getTime() - hours * HOUR_MS);

export const daysAgo = (days: number, now = new Date()) => new Date(now.getTime() - days * DAY_MS);

/** "2026-11-13" for the UTC calendar day of `date`. */
export const utcDay = (date: Date) => date.toISOString().slice(0, 10);

/** The last `count` UTC days, oldest first, ending with today. */
export function lastUtcDays(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => utcDay(daysAgo(count - 1 - i, now)));
}

export const daysUntil = (date: Date, now = new Date()) =>
  Math.floor((date.getTime() - now.getTime()) / DAY_MS);
