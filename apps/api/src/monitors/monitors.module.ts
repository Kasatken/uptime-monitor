import { Module } from '@nestjs/common';
import { MonitorsController } from './monitors.controller.js';
import { MonitorsRepository } from './monitors.repository.js';
import { MonitorsService } from './monitors.service.js';

@Module({
  controllers: [MonitorsController],
  providers: [MonitorsRepository, MonitorsService],
  exports: [MonitorsRepository, MonitorsService],
})
export class MonitorsModule {}
