import { formatDuration } from '@vigil/shared';
import type { Alert } from './notifier.js';

/** Plain-text alert body shared by channels that don't need their own formatting. */
export function alertTitle(alert: Alert): string {
  return alert.kind === 'down'
    ? `🔴 ${alert.monitorName} is down`
    : `🟢 ${alert.monitorName} is back up`;
}

export function alertLines(alert: Alert): string[] {
  const lines = [`Target: ${alert.target}`];
  if (alert.kind === 'down' && alert.cause) lines.push(`Cause: ${alert.cause}`);
  if (alert.kind === 'recovered' && alert.downtimeMs !== undefined) {
    lines.push(`Downtime: ${formatDuration(alert.downtimeMs)}`);
  }
  lines.push(alert.link);
  return lines;
}
