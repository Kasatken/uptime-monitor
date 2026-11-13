import { formatDuration } from '@vigil/shared';
import type { Alert } from './notifier.js';

export function alertTitle(alert: Alert): string {
  return alert.kind === 'down'
    ? `🔴 ${alert.monitorName} не работает`
    : `🟢 ${alert.monitorName} снова работает`;
}

export function alertLines(alert: Alert): string[] {
  const lines = [`Адрес: ${alert.target}`];
  if (alert.kind === 'down' && alert.cause) lines.push(`Причина: ${alert.cause}`);
  if (alert.kind === 'recovered' && alert.downtimeMs !== undefined) {
    lines.push(`Простой: ${formatDuration(alert.downtimeMs)}`);
  }
  lines.push(alert.link);
  return lines;
}
