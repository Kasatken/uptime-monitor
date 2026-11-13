import { Injectable } from '@nestjs/common';
import type { IncidentDto } from '@vigil/shared';
import { and, desc, eq, gte, isNotNull, isNull, or, type SQL, sql } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../database/database.js';
import { type IncidentRecord, incidents, monitors } from '../database/schema.js';

export type IncidentFilter = 'all' | 'open' | 'resolved';

interface ListOptions {
  monitorId?: string;
  filter?: IncidentFilter;
  since?: Date;
  publicOnly?: boolean;
  limit?: number;
}

@Injectable()
export class IncidentsRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Returns null if the monitor already has an open incident (guarded by a partial unique index). */
  async open(monitorId: string, cause: string | null): Promise<IncidentRecord | null> {
    const [row] = await this.db
      .insert(incidents)
      .values({ monitorId, cause })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  async resolveOpen(monitorId: string): Promise<IncidentRecord | null> {
    const [row] = await this.db
      .update(incidents)
      .set({ resolvedAt: new Date() })
      .where(and(eq(incidents.monitorId, monitorId), isNull(incidents.resolvedAt)))
      .returning();
    return row ?? null;
  }

  async list(options: ListOptions = {}): Promise<IncidentDto[]> {
    const { monitorId, filter = 'all', since, publicOnly = false, limit = 100 } = options;

    const conditions: SQL[] = [];
    if (monitorId) conditions.push(eq(incidents.monitorId, monitorId));
    if (filter === 'open') conditions.push(isNull(incidents.resolvedAt));
    if (filter === 'resolved') conditions.push(isNotNull(incidents.resolvedAt));
    if (publicOnly) conditions.push(eq(monitors.isPublic, true));
    if (since) {
      // still-open incidents are always relevant, however old
      const recentOrOpen = or(gte(incidents.startedAt, since), isNull(incidents.resolvedAt));
      if (recentOrOpen) conditions.push(recentOrOpen);
    }

    const rows = await this.db
      .select({
        id: incidents.id,
        monitorId: incidents.monitorId,
        monitorName: publicOnly
          ? sql<string>`coalesce(nullif(${monitors.publicName}, ''), ${monitors.name})`
          : monitors.name,
        startedAt: incidents.startedAt,
        resolvedAt: incidents.resolvedAt,
        cause: incidents.cause,
      })
      .from(incidents)
      .innerJoin(monitors, eq(monitors.id, incidents.monitorId))
      .where(and(...conditions))
      .orderBy(desc(incidents.startedAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      startedAt: row.startedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    }));
  }
}
