import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Public } from '../auth/public.decorator.js';
import { type Database, InjectDatabase } from '../database/database.js';
import { CheckScheduler } from '../scheduler/check-scheduler.js';

/** For Docker / load balancer health checks. Yes, the uptime monitor monitors itself. */
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly scheduler: CheckScheduler,
  ) {}

  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' });
    }
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      scheduledMonitors: this.scheduler.scheduledCount(),
    };
  }
}
