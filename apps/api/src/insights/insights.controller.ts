import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import type { MonitorStatsDto, MonitorSummaryDto, StatusPageDto } from '@vigil/shared';
import { Public } from '../auth/public.decorator.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { StatsService } from './stats.service.js';
import { StatusPageService } from './status-page.service.js';

/** Read-only endpoints that combine data from several modules. */
@Controller()
export class InsightsController {
  constructor(
    private readonly monitors: MonitorsRepository,
    private readonly stats: StatsService,
    private readonly statusPage: StatusPageService,
  ) {}

  /** Dashboard list: monitors + sparkline + 24h uptime in one request. */
  @Get('overview')
  async overview(): Promise<MonitorSummaryDto[]> {
    return this.stats.summarize(await this.monitors.findAll());
  }

  @Get('monitors/:id/stats')
  async monitorStats(@Param('id', ParseUUIDPipe) id: string): Promise<MonitorStatsDto> {
    const monitor = await this.monitors.findById(id);
    if (!monitor) throw new NotFoundException('Monitor not found');
    return this.stats.forMonitor(id);
  }

  @Public()
  @Get('status')
  status(): Promise<StatusPageDto> {
    return this.statusPage.build();
  }
}
