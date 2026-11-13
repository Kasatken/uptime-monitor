import { Injectable } from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../database/database.js';
import { type MonitorRecord, monitors, type NewMonitorRecord } from '../database/schema.js';

export type MonitorPatch = Partial<Omit<NewMonitorRecord, 'id' | 'type' | 'createdAt'>>;

@Injectable()
export class MonitorsRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  findAll(): Promise<MonitorRecord[]> {
    return this.db.select().from(monitors).orderBy(asc(monitors.createdAt));
  }

  findScheduled(): Promise<MonitorRecord[]> {
    return this.db.select().from(monitors).where(ne(monitors.status, 'paused'));
  }

  findPublic(): Promise<MonitorRecord[]> {
    return this.db
      .select()
      .from(monitors)
      .where(eq(monitors.isPublic, true))
      .orderBy(asc(monitors.createdAt));
  }

  async findById(id: string): Promise<MonitorRecord | null> {
    const [row] = await this.db.select().from(monitors).where(eq(monitors.id, id));
    return row ?? null;
  }

  async findByHeartbeatToken(token: string): Promise<MonitorRecord | null> {
    const [row] = await this.db.select().from(monitors).where(eq(monitors.heartbeatToken, token));
    return row ?? null;
  }

  async create(values: NewMonitorRecord): Promise<MonitorRecord> {
    const [row] = await this.db.insert(monitors).values(values).returning();
    if (!row) throw new Error('Insert returned no rows');
    return row;
  }

  async update(id: string, patch: MonitorPatch): Promise<MonitorRecord | null> {
    const [row] = await this.db.update(monitors).set(patch).where(eq(monitors.id, id)).returning();
    return row ?? null;
  }

  // If the monitor was paused while the check was running, the pause wins.
  async applyCheckResult(id: string, patch: MonitorPatch): Promise<MonitorRecord | null> {
    const [row] = await this.db
      .update(monitors)
      .set(patch)
      .where(and(eq(monitors.id, id), ne(monitors.status, 'paused')))
      .returning();
    return row ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(monitors)
      .where(eq(monitors.id, id))
      .returning({ id: monitors.id });
    return rows.length > 0;
  }
}
