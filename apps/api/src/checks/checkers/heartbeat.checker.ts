import { Injectable } from '@nestjs/common';
import { formatDuration } from '@vigil/shared';
import { type Checker, type CheckOutcome, MonitorChecker, type MonitorOf } from './checker.js';

@MonitorChecker('heartbeat')
@Injectable()
export class HeartbeatChecker implements Checker<'heartbeat'> {
  async check(monitor: MonitorOf<'heartbeat'>): Promise<CheckOutcome | null> {
    const allowedSilenceMs = (monitor.intervalSeconds + monitor.config.graceSeconds) * 1000;
    // Before the first ping, give the job one full window starting from creation
    const lastSeen = monitor.lastHeartbeatAt ?? monitor.createdAt;
    const silentForMs = Date.now() - lastSeen.getTime();

    if (silentForMs <= allowedSilenceMs) {
      return monitor.lastHeartbeatAt ? { status: 'up', responseMs: null } : null;
    }

    return {
      status: 'down',
      responseMs: null,
      message: monitor.lastHeartbeatAt
        ? `Нет сигнала уже ${formatDuration(silentForMs)}`
        : 'Сигнал ещё ни разу не приходил',
    };
  }
}
