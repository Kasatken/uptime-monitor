import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import type { IncidentDto } from '@vigil/shared';
import { type IncidentFilter, IncidentsRepository } from './incidents.repository.js';

const FILTERS: IncidentFilter[] = ['all', 'open', 'resolved'];

@Controller()
export class IncidentsController {
  constructor(private readonly incidents: IncidentsRepository) {}

  @Get('incidents')
  list(
    @Query('filter', new DefaultValuePipe('all'), new ParseEnumPipe(FILTERS))
    filter: IncidentFilter,
  ): Promise<IncidentDto[]> {
    return this.incidents.list({ filter, limit: 200 });
  }

  @Get('monitors/:id/incidents')
  forMonitor(@Param('id', ParseUUIDPipe) id: string): Promise<IncidentDto[]> {
    return this.incidents.list({ monitorId: id, limit: 50 });
  }
}
