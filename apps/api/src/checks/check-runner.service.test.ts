import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../config/app-config.js';
import type { MonitorRecord } from '../database/schema.js';
import { DomainEvent, type DomainEvents } from '../events/domain-events.js';
import type { MonitorsRepository } from '../monitors/monitors.repository.js';
import { CheckRunner } from './check-runner.service.js';
import type { CheckOutcome } from './checkers/checker.js';
import type { CheckerRegistry } from './checkers/checker.registry.js';
import type { ChecksRepository } from './checks.repository.js';

const monitor = {
  id: 'm1',
  name: 'Shop',
  type: 'http',
  status: 'up',
  failStreak: 0,
  failureThreshold: 1,
} as MonitorRecord;

function setup(checker: (signal: AbortSignal) => Promise<CheckOutcome | null>) {
  const monitors = {
    findById: vi.fn(async () => monitor),
    applyCheckResult: vi.fn(async (_id: string, patch: Partial<MonitorRecord>) => ({
      ...monitor,
      ...patch,
    })),
  };
  const checks = { record: vi.fn(async () => ({ id: 1, monitorId: 'm1', checkedAt: new Date() })) };
  const events = { emit: vi.fn() };
  const registry = {
    get: () => ({ check: (_m: unknown, signal: AbortSignal) => checker(signal) }),
  };

  const runner = new CheckRunner(
    { checks: { concurrency: 2, retentionDays: 30 } } as AppConfig,
    registry as unknown as CheckerRegistry,
    monitors as unknown as MonitorsRepository,
    checks as unknown as ChecksRepository,
    events as unknown as DomainEvents,
  );
  return { runner, monitors, checks, events };
}

describe('CheckRunner', () => {
  it('records the check and emits a status change', async () => {
    const { runner, checks, events } = setup(async () => ({
      status: 'down',
      responseMs: null,
      message: 'Connection refused',
    }));

    await runner.run('m1');

    expect(checks.record).toHaveBeenCalledOnce();
    const emitted = events.emit.mock.calls.map(([name]) => name);
    expect(emitted).toEqual([DomainEvent.CheckCompleted, DomainEvent.MonitorStatusChanged]);
  });

  it('shares one in-flight run between concurrent callers', async () => {
    let calls = 0;
    const { runner } = setup(async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: 'up', responseMs: 10 };
    });

    const [a, b] = await Promise.all([runner.run('m1'), runner.run('m1')]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
  });

  it('does not record checks cut off by shutdown as failures', async () => {
    const { runner, checks } = setup(
      (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () =>
            resolve({ status: 'down', responseMs: null, message: 'Check was cancelled' }),
          );
        }),
    );

    const run = runner.run('m1');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await runner.onApplicationShutdown();

    expect(await run).toBeNull();
    expect(checks.record).not.toHaveBeenCalled();
  });

  it('treats a crashing checker as down instead of throwing', async () => {
    const { runner, monitors } = setup(async () => {
      throw new Error('bug');
    });
    await runner.run('m1');
    expect(monitors.applyCheckResult).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ status: 'down', lastMessage: 'Internal checker error' }),
    );
  });
});
