/** 75_000 → "1m 15s", 93_784_000 → "1d 2h". Shows the two most significant units. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const units: Array<[label: string, seconds: number]> = [
    ['d', 86_400],
    ['h', 3_600],
    ['m', 60],
    ['s', 1],
  ];

  const parts: string[] = [];
  let rest = totalSeconds;
  for (const [label, size] of units) {
    const value = Math.floor(rest / size);
    rest -= value * size;
    if (value > 0) parts.push(`${value}${label}`);
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(' ') : '0s';
}

/** Human label for a check interval: 30 → "30s", 300 → "5m", 3600 → "1h". */
export function formatInterval(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}
