import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CheckRunner } from '../checks/check-runner.service.js';
import {
  DomainEvent,
  type MonitorRemovedEvent,
  type MonitorSavedEvent,
} from '../events/domain-events.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { CheckScheduler, type SchedulableMonitor } from './check-scheduler.js';

/** Spread first runs over this window so a restart doesn't fire every check in the same tick. */
const MAX_START_JITTER_MS = 10_000;

/**
 * One chained setTimeout per monitor. setTimeout (not setInterval) guarantees a
 * slow check never overlaps with the next run of the same monitor.
 */
@Injectable()
export class InMemoryCheckScheduler
  extends CheckScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(InMemoryCheckScheduler.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private stopped = false;

  constructor(
    private readonly runner: CheckRunner,
    private readonly monitors: MonitorsRepository,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    const monitors = await this.monitors.findScheduled();
    for (const monitor of monitors) this.schedule(monitor);
    this.logger.log(`Scheduled ${monitors.length} monitor(s)`);
  }

  onApplicationShutdown() {
    this.stopped = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  @OnEvent(DomainEvent.MonitorSaved)
  handleMonitorSaved({ monitor }: MonitorSavedEvent) {
    if (monitor.status === 'paused') this.unschedule(monitor.id);
    // Run right away so the user sees the result of a new or edited monitor immediately
    else this.schedule(monitor, { runImmediately: true });
  }

  @OnEvent(DomainEvent.MonitorRemoved)
  handleMonitorRemoved({ id }: MonitorRemovedEvent) {
    this.unschedule(id);
  }

  schedule(monitor: SchedulableMonitor, { runImmediately = false } = {}) {
    this.unschedule(monitor.id);
    const intervalMs = monitor.intervalSeconds * 1000;
    const firstDelay = runImmediately
      ? 0
      : Math.round(Math.random() * Math.min(intervalMs, MAX_START_JITTER_MS));
    this.plan(monitor.id, intervalMs, firstDelay);
  }

  unschedule(monitorId: string) {
    clearTimeout(this.timers.get(monitorId));
    this.timers.delete(monitorId);
  }

  scheduledCount() {
    return this.timers.size;
  }

  private plan(monitorId: string, intervalMs: number, delayMs: number) {
    const timer = setTimeout(async () => {
      const startedAt = Date.now();
      try {
        await this.runner.run(monitorId);
      } catch (error) {
        this.logger.error(`Check run failed for monitor ${monitorId}`, error);
      }

      // Rescheduled (edited) or removed while the check was running – that chain wins
      if (this.stopped || this.timers.get(monitorId) !== timer) return;

      const elapsed = Date.now() - startedAt;
      this.plan(monitorId, intervalMs, Math.max(0, intervalMs - elapsed));
    }, delayMs);

    this.timers.set(monitorId, timer);
  }
}
