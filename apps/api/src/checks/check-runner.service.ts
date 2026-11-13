import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Semaphore } from '../common/semaphore.js';
import { AppConfig } from '../config/app-config.js';
import type { CheckRecord, MonitorRecord } from '../database/schema.js';
import { DomainEvent, DomainEvents } from '../events/domain-events.js';
import { nextMonitorState } from '../monitors/monitor-state.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import type { CheckOutcome, MonitorOf } from './checkers/checker.js';
import { CheckerRegistry } from './checkers/checker.registry.js';
import { ChecksRepository } from './checks.repository.js';

@Injectable()
export class CheckRunner implements OnApplicationShutdown {
  private readonly logger = new Logger(CheckRunner.name);
  private readonly slots: Semaphore;
  private readonly inFlight = new Map<string, Promise<CheckRecord | null>>();
  private readonly shutdown = new AbortController();

  constructor(
    config: AppConfig,
    private readonly registry: CheckerRegistry,
    private readonly monitors: MonitorsRepository,
    private readonly checks: ChecksRepository,
    private readonly events: DomainEvents,
  ) {
    this.slots = new Semaphore(config.checks.concurrency);
  }

  // A scheduled run and a "check now" click at the same time share one promise.
  run(monitorId: string): Promise<CheckRecord | null> {
    const running = this.inFlight.get(monitorId);
    if (running) return running;

    const task = this.slots
      .use(() => this.execute(monitorId))
      .finally(() => this.inFlight.delete(monitorId));

    this.inFlight.set(monitorId, task);
    return task;
  }

  async onApplicationShutdown() {
    this.shutdown.abort();
    await Promise.allSettled(this.inFlight.values());
  }

  private async execute(monitorId: string): Promise<CheckRecord | null> {
    if (this.shutdown.signal.aborted) return null;

    const monitor = await this.monitors.findById(monitorId);
    if (!monitor || monitor.status === 'paused') return null;

    const outcome = await this.probe(monitor);
    if (!outcome) return null;
    // Interrupted by our own shutdown – that says nothing about the target, don't record it
    if (this.shutdown.signal.aborted) return null;

    const checkedAt = new Date();
    const check = await this.checks.record(monitor.id, outcome, checkedAt);
    const next = nextMonitorState(monitor, outcome.status, monitor.failureThreshold);

    const updated = await this.monitors.applyCheckResult(monitor.id, {
      status: next.status,
      failStreak: next.failStreak,
      lastCheckedAt: checkedAt,
      lastResponseMs: outcome.responseMs,
      lastMessage: outcome.message ?? null,
      ...(outcome.sslExpiresAt !== undefined && { sslExpiresAt: outcome.sslExpiresAt }),
    });
    // Paused or deleted while the check was running
    if (!updated) return check;

    this.events.emit(DomainEvent.CheckCompleted, { monitor: updated, check });
    if (next.changed) {
      this.logger.log(`${updated.name}: ${next.previousStatus} → ${next.status}`);
      this.events.emit(DomainEvent.MonitorStatusChanged, {
        monitor: updated,
        previousStatus: next.previousStatus,
        cause: outcome.message ?? null,
      });
    }
    return check;
  }

  private async probe(monitor: MonitorRecord): Promise<CheckOutcome | null> {
    try {
      const checker = this.registry.get(monitor.type);
      return await checker.check(monitor as MonitorOf<typeof monitor.type>, this.shutdown.signal);
    } catch (error) {
      this.logger.error(`Checker crashed for monitor ${monitor.id}`, error);
      return { status: 'down', responseMs: null, message: 'Внутренняя ошибка проверки' };
    }
  }
}
