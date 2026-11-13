/**
 * Rounds *down*, so 99.996% shows as 99.99% and never as a misleading 100.00%.
 */
export function formatUptime(ratio: number | null): string {
  if (ratio === null) return '—';
  if (ratio >= 1) return '100%';
  const floored = Math.floor(ratio * 10_000) / 100;
  return `${floored.toFixed(2)}%`;
}

export function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export const pluralize = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
