import type { MonitorRecord } from '../database/schema.js';

export type SchedulableMonitor = Pick<MonitorRecord, 'id' | 'intervalSeconds'>;

// Swap point: a BullMQ adapter (queue.upsertJobScheduler) can replace the in-memory one.
export abstract class CheckScheduler {
  abstract schedule(monitor: SchedulableMonitor, options?: { runImmediately?: boolean }): void;
  abstract unschedule(monitorId: string): void;
  abstract scheduledCount(): number;
}
