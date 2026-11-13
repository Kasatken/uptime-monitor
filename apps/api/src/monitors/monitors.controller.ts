import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  type CreateMonitorInput,
  createMonitorSchema,
  type MonitorDto,
  type UpdateMonitorInput,
  updateMonitorSchema,
} from '@vigil/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toMonitorDto } from './monitor.mapper.js';
import { MonitorsService } from './monitors.service.js';

@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitors: MonitorsService) {}

  @Get()
  async list(): Promise<MonitorDto[]> {
    const records = await this.monitors.list();
    return records.map(toMonitorDto);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<MonitorDto> {
    return toMonitorDto(await this.monitors.get(id));
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createMonitorSchema)) body: CreateMonitorInput,
  ): Promise<MonitorDto> {
    return toMonitorDto(await this.monitors.create(body));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMonitorSchema)) body: UpdateMonitorInput,
  ): Promise<MonitorDto> {
    return toMonitorDto(await this.monitors.update(id, body));
  }

  @Post(':id/pause')
  @HttpCode(200)
  async pause(@Param('id', ParseUUIDPipe) id: string): Promise<MonitorDto> {
    return toMonitorDto(await this.monitors.pause(id));
  }

  @Post(':id/resume')
  @HttpCode(200)
  async resume(@Param('id', ParseUUIDPipe) id: string): Promise<MonitorDto> {
    return toMonitorDto(await this.monitors.resume(id));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.monitors.remove(id);
  }
}
