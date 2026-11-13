export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const units: Array<[label: string, seconds: number]> = [
    ['д', 86_400],
    ['ч', 3_600],
    ['мин', 60],
    ['с', 1],
  ];

  const parts: string[] = [];
  let rest = totalSeconds;
  for (const [label, size] of units) {
    const value = Math.floor(rest / size);
    rest -= value * size;
    if (value > 0) parts.push(`${value} ${label}`);
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(' ') : '0 с';
}

export function formatInterval(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600} ч`;
  if (seconds % 60 === 0) return `${seconds / 60} мин`;
  return `${seconds} с`;
}
