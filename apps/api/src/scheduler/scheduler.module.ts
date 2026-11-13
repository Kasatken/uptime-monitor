import { Module } from '@nestjs/common';
import { ChecksModule } from '../checks/checks.module.js';
import { MonitorsModule } from '../monitors/monitors.module.js';
import { CheckScheduler } from './check-scheduler.js';
import { InMemoryCheckScheduler } from './in-memory-check.scheduler.js';

@Module({
  imports: [ChecksModule, MonitorsModule],
  providers: [{ provide: CheckScheduler, useClass: InMemoryCheckScheduler }],
  exports: [CheckScheduler],
})
export class SchedulerModule {}
