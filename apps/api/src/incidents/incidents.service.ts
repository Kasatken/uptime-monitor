import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DomainEvent,
  DomainEvents,
  type MonitorStatusChangedEvent,
} from '../events/domain-events.js';
import { IncidentsRepository } from './incidents.repository.js';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly incidents: IncidentsRepository,
    private readonly events: DomainEvents,
  ) {}

  @OnEvent(DomainEvent.MonitorStatusChanged)
  async handleStatusChange({ monitor, previousStatus, cause }: MonitorStatusChangedEvent) {
    if (monitor.status === 'down') {
      const incident = await this.incidents.open(monitor.id, cause);
      if (incident) this.events.emit(DomainEvent.IncidentOpened, { incident, monitor });
      return;
    }

    if (previousStatus === 'down') {
      const incident = await this.incidents.resolveOpen(monitor.id);
      if (incident) this.events.emit(DomainEvent.IncidentResolved, { incident, monitor });
    }
  }
}
