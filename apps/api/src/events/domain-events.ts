import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { MonitorStatus } from '@vigil/shared';
import type { CheckRecord, IncidentRecord, MonitorRecord } from '../database/schema.js';

/**
 * Modules talk to each other through these events instead of calling each other:
 * the check runner doesn't know that incidents, alerts or websockets exist.
 */
export const DomainEvent = {
  MonitorSaved: 'monitor.saved',
  MonitorRemoved: 'monitor.removed',
  CheckCompleted: 'check.completed',
  MonitorStatusChanged: 'monitor.status-changed',
  IncidentOpened: 'incident.opened',
  IncidentResolved: 'incident.resolved',
} as const;

export interface MonitorSavedEvent {
  monitor: MonitorRecord;
}

export interface MonitorRemovedEvent {
  id: string;
}

export interface CheckCompletedEvent {
  monitor: MonitorRecord;
  check: CheckRecord;
}

export interface MonitorStatusChangedEvent {
  monitor: MonitorRecord;
  previousStatus: MonitorStatus;
  /** Message of the check that caused the change, if any. */
  cause: string | null;
}

export interface IncidentEvent {
  incident: IncidentRecord;
  monitor: MonitorRecord;
}

interface DomainEventPayloads {
  [DomainEvent.MonitorSaved]: MonitorSavedEvent;
  [DomainEvent.MonitorRemoved]: MonitorRemovedEvent;
  [DomainEvent.CheckCompleted]: CheckCompletedEvent;
  [DomainEvent.MonitorStatusChanged]: MonitorStatusChangedEvent;
  [DomainEvent.IncidentOpened]: IncidentEvent;
  [DomainEvent.IncidentResolved]: IncidentEvent;
}

/** Thin typed wrapper so an event name can't be emitted with the wrong payload. */
@Injectable()
export class DomainEvents {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<K extends keyof DomainEventPayloads>(event: K, payload: DomainEventPayloads[K]): void {
    this.emitter.emit(event, payload);
  }
}
