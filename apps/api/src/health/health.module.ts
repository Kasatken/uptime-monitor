import { Module } from '@nestjs/common';
import { SchedulerModule } from '../scheduler/scheduler.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [SchedulerModule],
  controllers: [HealthController],
})
export class HealthModule {}
