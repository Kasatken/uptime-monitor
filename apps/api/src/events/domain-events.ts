import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { MonitorStatus } from '@vigil/shared';
import type { CheckRecord, IncidentRecord, MonitorRecord } from '../database/schema.js';

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

@Injectable()
export class DomainEvents {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<K extends keyof DomainEventPayloads>(event: K, payload: DomainEventPayloads[K]): void {
    this.emitter.emit(event, payload);
  }
}
