import { Module } from '@nestjs/common';
import { ChecksModule } from '../checks/checks.module.js';
import { IncidentsModule } from '../incidents/incidents.module.js';
import { MonitorsModule } from '../monitors/monitors.module.js';
import { InsightsController } from './insights.controller.js';
import { StatsService } from './stats.service.js';
import { StatusPageService } from './status-page.service.js';

@Module({
  imports: [MonitorsModule, ChecksModule, IncidentsModule],
  controllers: [InsightsController],
  providers: [StatsService, StatusPageService],
})
export class InsightsModule {}
