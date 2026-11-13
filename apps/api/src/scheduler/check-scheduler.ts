import type { MonitorRecord } from '../database/schema.js';

export type SchedulableMonitor = Pick<MonitorRecord, 'id' | 'intervalSeconds'>;

/**
 * Port: decides *when* a monitor's check runs. The rest of the app never talks
 * to an implementation directly – it only emits MonitorSaved / MonitorRemoved.
 *
 * Today: InMemoryCheckScheduler (timers in this process, zero infrastructure).
 * Later: a BullMQ adapter with `queue.upsertJobScheduler()` for several worker
 * processes – one class, bound in SchedulerModule.
 */
export abstract class CheckScheduler {
  abstract schedule(monitor: SchedulableMonitor, options?: { runImmediately?: boolean }): void;
  abstract unschedule(monitorId: string): void;
  abstract scheduledCount(): number;
}
