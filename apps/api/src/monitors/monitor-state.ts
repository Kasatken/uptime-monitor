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
 * A monitor goes down only after `failureThreshold` failed checks in a row (filters out
 * network blips); until then the last known status is kept. Recovery is immediate.
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
