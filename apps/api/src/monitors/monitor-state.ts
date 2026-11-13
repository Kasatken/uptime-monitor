import type { CheckStatus, MonitorStatus } from '@vigil/shared';

export interface MonitorState {
  status: MonitorStatus;
  failStreak: number;
}

export interface MonitorTransition extends MonitorState {
  previousStatus: MonitorStatus;
  changed: boolean;
}

/**
 * Decides the monitor status after a check.
 *
 * A single failed check doesn't mark a monitor down: it has to fail
 * `failureThreshold` times in a row. Until then the last known status is kept,
 * which filters out network blips and avoids "down/up" alert spam.
 * Recovery is immediate – one good check is enough.
 */
export function nextMonitorState(
  current: MonitorState,
  result: CheckStatus,
  failureThreshold: number,
): MonitorTransition {
  if (result !== 'down') {
    return {
      status: result,
      failStreak: 0,
      previousStatus: current.status,
      changed: result !== current.status,
    };
  }

  const failStreak = current.failStreak + 1;
  const status: MonitorStatus = failStreak >= failureThreshold ? 'down' : current.status;

  return {
    status,
    failStreak,
    previousStatus: current.status,
    changed: status !== current.status,
  };
}
