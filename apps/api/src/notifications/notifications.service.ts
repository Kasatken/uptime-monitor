import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppConfig } from '../config/app-config.js';
import { DomainEvent, type IncidentEvent } from '../events/domain-events.js';
import { describeTarget } from '../monitors/monitor.mapper.js';
import { type Alert, NOTIFIERS, type Notifier } from './notifier.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFIERS) private readonly notifiers: Notifier[],
    private readonly config: AppConfig,
  ) {
    const names = notifiers.map((notifier) => notifier.name);
    this.logger.log(
      names.length ? `Alert channels: ${names.join(', ')}` : 'No alert channels configured',
    );
  }

  @OnEvent(DomainEvent.IncidentOpened)
  async handleIncidentOpened({ incident, monitor }: IncidentEvent) {
    await this.dispatch({
      kind: 'down',
      monitorName: monitor.name,
      target: describeTarget(monitor),
      cause: incident.cause,
      startedAt: incident.startedAt,
      link: `${this.config.appUrl}/admin/monitors/${monitor.id}`,
    });
  }

  @OnEvent(DomainEvent.IncidentResolved)
  async handleIncidentResolved({ incident, monitor }: IncidentEvent) {
    // Pausing a monitor also closes its incident – that's not a recovery worth a ping
    if (monitor.status === 'paused') return;

    await this.dispatch({
      kind: 'recovered',
      monitorName: monitor.name,
      target: describeTarget(monitor),
      cause: incident.cause,
      startedAt: incident.startedAt,
      downtimeMs: (incident.resolvedAt ?? new Date()).getTime() - incident.startedAt.getTime(),
      link: `${this.config.appUrl}/admin/monitors/${monitor.id}`,
    });
  }

  private async dispatch(alert: Alert) {
    const results = await Promise.allSettled(this.notifiers.map((n) => n.send(alert)));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(`${this.notifiers[index]?.name} alert failed: ${String(result.reason)}`);
      }
    });
  }
}
