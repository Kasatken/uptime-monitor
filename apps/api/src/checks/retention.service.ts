import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { daysAgo } from '../common/time.js';
import { AppConfig } from '../config/app-config.js';
import { ChecksRepository } from './checks.repository.js';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly config: AppConfig,
    private readonly checks: ChecksRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async pruneOldChecks() {
    const removed = await this.checks.deleteOlderThan(daysAgo(this.config.checks.retentionDays));
    if (removed > 0)
      this.logger.log(
        `Pruned ${removed} checks older than ${this.config.checks.retentionDays} days`,
      );
  }
}
