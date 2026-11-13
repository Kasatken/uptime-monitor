import { Injectable } from '@nestjs/common';
import { computeOverallStatus, type StatusPageDto } from '@vigil/shared';
import { daysAgo } from '../common/time.js';
import { AppConfig } from '../config/app-config.js';
import { IncidentsRepository } from '../incidents/incidents.repository.js';
import { displayName } from '../monitors/monitor.mapper.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { aggregateUptime } from './daily-series.js';
import { HISTORY_DAYS, StatsService } from './stats.service.js';

const INCIDENT_HISTORY_DAYS = 14;

/**
 * Builds the public page. Only explicitly public monitors are included, and only
 * safe fields: public name, status, numbers. No URLs, hosts or error messages.
 */
@Injectable()
export class StatusPageService {
  constructor(
    private readonly config: AppConfig,
    private readonly monitors: MonitorsRepository,
    private readonly incidents: IncidentsRepository,
    private readonly stats: StatsService,
  ) {}

  async build(): Promise<StatusPageDto> {
    const monitors = await this.monitors.findPublic();
    const [series, incidents] = await Promise.all([
      this.stats.dailySeries(
        monitors.map((m) => m.id),
        HISTORY_DAYS,
      ),
      this.incidents.list({
        publicOnly: true,
        since: daysAgo(INCIDENT_HISTORY_DAYS),
        limit: 50,
      }),
    ]);

    const items = monitors.map((monitor) => {
      const days = series.get(monitor.id) ?? [];
      return {
        id: monitor.id,
        name: displayName(monitor),
        status: monitor.status,
        uptime90d: aggregateUptime(days),
        lastResponseMs: monitor.lastResponseMs,
        lastCheckedAt: monitor.lastCheckedAt?.toISOString() ?? null,
        days,
      };
    });

    return {
      title: this.config.statusPageTitle,
      overall: computeOverallStatus(items.map((item) => item.status)),
      monitors: items,
      incidents: incidents.map(({ cause: _cause, ...incident }) => incident),
      generatedAt: new Date().toISOString(),
    };
  }
}
