import { Injectable } from '@nestjs/common';
import type { CheckPointDto } from '@vigil/shared';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lt, ne, sql } from 'drizzle-orm';
import { utcDay } from '../common/time.js';
import { type Database, InjectDatabase } from '../database/database.js';
import { type CheckRecord, checks, monitorDailyStats, monitors } from '../database/schema.js';
import type { CheckOutcome } from './checkers/checker.js';

export type DailyStatsRow = typeof monitorDailyStats.$inferSelect;

@Injectable()
export class ChecksRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Stores a check and bumps the daily counters in one transaction. */
  record(monitorId: string, outcome: CheckOutcome, checkedAt: Date): Promise<CheckRecord> {
    const isDown = outcome.status === 'down';
    const hasResponseTime = outcome.responseMs !== null;

    return this.db.transaction(async (tx) => {
      const [check] = await tx
        .insert(checks)
        .values({
          monitorId,
          status: outcome.status,
          responseMs: outcome.responseMs,
          statusCode: outcome.statusCode ?? null,
          message: outcome.message ?? null,
          checkedAt,
        })
        .returning();

      await tx
        .insert(monitorDailyStats)
        .values({
          monitorId,
          day: utcDay(checkedAt),
          totalChecks: 1,
          downChecks: isDown ? 1 : 0,
          responseMsSum: outcome.responseMs ?? 0,
          responseSamples: hasResponseTime ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: [monitorDailyStats.monitorId, monitorDailyStats.day],
          set: {
            totalChecks: sql`${monitorDailyStats.totalChecks} + 1`,
            downChecks: sql`${monitorDailyStats.downChecks} + excluded.down_checks`,
            responseMsSum: sql`${monitorDailyStats.responseMsSum} + excluded.response_ms_sum`,
            responseSamples: sql`${monitorDailyStats.responseSamples} + excluded.response_samples`,
          },
        });

      if (!check) throw new Error('Insert returned no rows');
      return check;
    });
  }

  listRecent(monitorId: string, limit: number): Promise<CheckRecord[]> {
    return this.db
      .select()
      .from(checks)
      .where(eq(checks.monitorId, monitorId))
      .orderBy(desc(checks.checkedAt))
      .limit(limit);
  }

  async pointsSince(monitorId: string, since: Date): Promise<CheckPointDto[]> {
    const rows = await this.db
      .select({ status: checks.status, responseMs: checks.responseMs, checkedAt: checks.checkedAt })
      .from(checks)
      .where(and(eq(checks.monitorId, monitorId), gte(checks.checkedAt, since)))
      .orderBy(asc(checks.checkedAt));
    return rows.map((row) => ({ ...row, checkedAt: row.checkedAt.toISOString() }));
  }

  /**
   * Last N checks for every monitor in one round trip. LATERAL lets Postgres use
   * the (monitor_id, checked_at desc) index per monitor instead of ranking all rows.
   */
  async recentPoints(monitorIds: string[], perMonitor: number) {
    const result = new Map<string, CheckPointDto[]>();
    if (monitorIds.length === 0) return result;

    const latest = this.db
      .select({ status: checks.status, responseMs: checks.responseMs, checkedAt: checks.checkedAt })
      .from(checks)
      .where(eq(checks.monitorId, monitors.id))
      .orderBy(desc(checks.checkedAt))
      .limit(perMonitor)
      .as('latest');

    const rows = await this.db
      .select({
        monitorId: monitors.id,
        status: latest.status,
        responseMs: latest.responseMs,
        checkedAt: latest.checkedAt,
      })
      .from(monitors)
      .innerJoinLateral(latest, sql`true`)
      .where(inArray(monitors.id, monitorIds))
      .orderBy(asc(latest.checkedAt));

    for (const { monitorId, checkedAt, ...point } of rows) {
      const points = result.get(monitorId) ?? [];
      points.push({ ...point, checkedAt: checkedAt.toISOString() });
      result.set(monitorId, points);
    }
    return result;
  }

  /** Share of non-down checks since `since`, per monitor (0..1). */
  async uptimeSince(monitorIds: string[], since: Date): Promise<Map<string, number>> {
    if (monitorIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        monitorId: checks.monitorId,
        total: count(),
        up: sql<number>`count(*) filter (where ${checks.status} <> 'down')`.mapWith(Number),
      })
      .from(checks)
      .where(and(inArray(checks.monitorId, monitorIds), gte(checks.checkedAt, since)))
      .groupBy(checks.monitorId);

    return new Map(rows.map((row) => [row.monitorId, row.up / row.total]));
  }

  async responseStatsSince(monitorId: string, since: Date) {
    const [row] = await this.db
      .select({
        avg: sql<number | null>`round(avg(${checks.responseMs}))`.mapWith(Number),
        p95: sql<
          number | null
        >`round(percentile_cont(0.95) within group (order by ${checks.responseMs}))`.mapWith(
          Number,
        ),
      })
      .from(checks)
      .where(
        and(
          eq(checks.monitorId, monitorId),
          gte(checks.checkedAt, since),
          ne(checks.status, 'down'),
          isNotNull(checks.responseMs),
        ),
      );
    return { avg: row?.avg ?? null, p95: row?.p95 ?? null };
  }

  dailyStats(monitorIds: string[], fromDay: string): Promise<DailyStatsRow[]> {
    if (monitorIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(monitorDailyStats)
      .where(
        and(inArray(monitorDailyStats.monitorId, monitorIds), gte(monitorDailyStats.day, fromDay)),
      );
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const rows = await this.db
      .delete(checks)
      .where(lt(checks.checkedAt, date))
      .returning({ id: checks.id });
    return rows.length;
  }
}
