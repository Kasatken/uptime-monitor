import {
  ConflictException,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { CheckDto, CheckPointDto } from '@vigil/shared';
import { hoursAgo } from '../common/time.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { toCheckDto } from './check.mapper.js';
import { CheckRunner } from './check-runner.service.js';
import { ChecksRepository } from './checks.repository.js';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

@Controller('monitors/:id')
export class ChecksController {
  constructor(
    private readonly checks: ChecksRepository,
    private readonly monitors: MonitorsRepository,
    private readonly runner: CheckRunner,
  ) {}

  @Get('checks')
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<CheckDto[]> {
    const rows = await this.checks.listRecent(id, clamp(limit, 1, 500));
    return rows.map(toCheckDto);
  }

  @Get('response-times')
  responseTimes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ): Promise<CheckPointDto[]> {
    return this.checks.pointsSince(id, hoursAgo(clamp(hours, 1, 24 * 7)));
  }

  @Post('check')
  @HttpCode(200)
  async runNow(@Param('id', ParseUUIDPipe) id: string): Promise<CheckDto | null> {
    const monitor = await this.monitors.findById(id);
    if (!monitor) throw new NotFoundException('Монитор не найден');
    if (monitor.status === 'paused') throw new ConflictException('Монитор на паузе');

    const check = await this.runner.run(id);
    return check ? toCheckDto(check) : null;
  }
}
