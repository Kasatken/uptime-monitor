import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateMonitorInput,
  type MonitorConfig,
  type MonitorType,
  monitorConfigSchemas,
  type UpdateMonitorInput,
} from '@vigil/shared';
import { toValidationIssues, validationFailed } from '../common/zod-validation.pipe.js';
import type { MonitorRecord } from '../database/schema.js';
import { DomainEvent, DomainEvents } from '../events/domain-events.js';
import { type MonitorPatch, MonitorsRepository } from './monitors.repository.js';

const newHeartbeatToken = () => randomBytes(18).toString('base64url');

@Injectable()
export class MonitorsService {
  constructor(
    private readonly monitors: MonitorsRepository,
    private readonly events: DomainEvents,
  ) {}

  list(): Promise<MonitorRecord[]> {
    return this.monitors.findAll();
  }

  async get(id: string): Promise<MonitorRecord> {
    const monitor = await this.monitors.findById(id);
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  async create(input: CreateMonitorInput): Promise<MonitorRecord> {
    const monitor = await this.monitors.create({
      name: input.name,
      type: input.type,
      config: input.config,
      intervalSeconds: input.intervalSeconds,
      failureThreshold: input.failureThreshold,
      isPublic: input.isPublic,
      publicName: input.publicName || null,
      heartbeatToken: input.type === 'heartbeat' ? newHeartbeatToken() : null,
    });

    this.events.emit(DomainEvent.MonitorSaved, { monitor });
    return monitor;
  }

  async update(id: string, input: UpdateMonitorInput): Promise<MonitorRecord> {
    const existing = await this.get(id);
    const { config, ...fields } = input;

    const patch: MonitorPatch = { ...fields };
    if (fields.publicName !== undefined) patch.publicName = fields.publicName || null;
    if (config) patch.config = this.parseConfig(existing.type, config);

    const monitor = await this.monitors.update(id, patch);
    if (!monitor) throw new NotFoundException('Monitor not found');

    this.events.emit(DomainEvent.MonitorSaved, { monitor });
    return monitor;
  }

  async pause(id: string): Promise<MonitorRecord> {
    const existing = await this.get(id);
    if (existing.status === 'paused') return existing;

    const monitor = await this.monitors.update(id, { status: 'paused', failStreak: 0 });
    if (!monitor) throw new NotFoundException('Monitor not found');

    this.events.emit(DomainEvent.MonitorSaved, { monitor });
    this.events.emit(DomainEvent.MonitorStatusChanged, {
      monitor,
      previousStatus: existing.status,
      cause: null,
    });
    return monitor;
  }

  async resume(id: string): Promise<MonitorRecord> {
    const existing = await this.get(id);
    if (existing.status !== 'paused') return existing;

    const monitor = await this.monitors.update(id, { status: 'pending', failStreak: 0 });
    if (!monitor) throw new NotFoundException('Monitor not found');

    this.events.emit(DomainEvent.MonitorSaved, { monitor });
    return monitor;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.monitors.remove(id);
    if (!removed) throw new NotFoundException('Monitor not found');
    this.events.emit(DomainEvent.MonitorRemoved, { id });
  }

  private parseConfig(type: MonitorType, config: unknown): MonitorConfig {
    const result = monitorConfigSchemas[type].safeParse(config);
    if (!result.success) throw validationFailed(toValidationIssues(result.error, 'config'));
    return result.data;
  }
}
