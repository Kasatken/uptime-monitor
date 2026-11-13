import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import type { MonitorStatsDto, MonitorSummaryDto, StatusPageDto } from '@vigil/shared';
import { Public } from '../auth/public.decorator.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { StatsService } from './stats.service.js';
import { StatusPageService } from './status-page.service.js';

@Controller()
export class InsightsController {
  constructor(
    private readonly monitors: MonitorsRepository,
    private readonly stats: StatsService,
    private readonly statusPage: StatusPageService,
  ) {}

  @Get('overview')
  async overview(): Promise<MonitorSummaryDto[]> {
    return this.stats.summarize(await this.monitors.findAll());
  }

  @Get('monitors/:id/stats')
  async monitorStats(@Param('id', ParseUUIDPipe) id: string): Promise<MonitorStatsDto> {
    const monitor = await this.monitors.findById(id);
    if (!monitor) throw new NotFoundException('Монитор не найден');
    return this.stats.forMonitor(id);
  }

  @Public()
  @Get('status')
  status(): Promise<StatusPageDto> {
    return this.statusPage.build();
  }
}
