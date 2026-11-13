import { CHECK_STATUSES, MONITOR_STATUSES, MONITOR_TYPES, type MonitorConfig } from '@vigil/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const monitorType = pgEnum('monitor_type', MONITOR_TYPES);
export const monitorStatus = pgEnum('monitor_status', MONITOR_STATUSES);
export const checkStatus = pgEnum('check_status', CHECK_STATUSES);

const timestamptz = () => timestamp({ withTimezone: true });

export const monitors = pgTable('monitors', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  type: monitorType().notNull(),
  config: jsonb().$type<MonitorConfig>().notNull(),
  intervalSeconds: integer().notNull(),
  failureThreshold: integer().notNull().default(2),
  isPublic: boolean().notNull().default(false),
  publicName: text(),

  status: monitorStatus().notNull().default('pending'),
  failStreak: integer().notNull().default(0),
  lastCheckedAt: timestamptz(),
  lastResponseMs: integer(),
  lastMessage: text(),
  sslExpiresAt: timestamptz(),

  heartbeatToken: text().unique(),
  lastHeartbeatAt: timestamptz(),

  createdAt: timestamptz().notNull().defaultNow(),
  updatedAt: timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const checks = pgTable(
  'checks',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    monitorId: uuid()
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    status: checkStatus().notNull(),
    responseMs: integer(),
    statusCode: integer(),
    message: text(),
    checkedAt: timestamptz().notNull().defaultNow(),
  },
  (t) => [index('checks_monitor_time_idx').on(t.monitorId, t.checkedAt.desc())],
);

// Daily counters survive the pruning of raw checks and power the 90-day history.
export const monitorDailyStats = pgTable(
  'monitor_daily_stats',
  {
    monitorId: uuid()
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    day: date({ mode: 'string' }).notNull(),
    totalChecks: integer().notNull().default(0),
    downChecks: integer().notNull().default(0),
    responseMsSum: bigint({ mode: 'number' }).notNull().default(0),
    responseSamples: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.monitorId, t.day] })],
);

export const incidents = pgTable(
  'incidents',
  {
    id: uuid().primaryKey().defaultRandom(),
    monitorId: uuid()
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    startedAt: timestamptz().notNull().defaultNow(),
    resolvedAt: timestamptz(),
    cause: text(),
  },
  (t) => [
    index('incidents_monitor_started_idx').on(t.monitorId, t.startedAt.desc()),
    // The database guarantees at most one open incident per monitor.
    uniqueIndex('incidents_one_open_per_monitor')
      .on(t.monitorId)
      .where(sql`${t.resolvedAt} is null`),
  ],
);

export type MonitorRecord = typeof monitors.$inferSelect;
export type NewMonitorRecord = typeof monitors.$inferInsert;
export type CheckRecord = typeof checks.$inferSelect;
export type IncidentRecord = typeof incidents.$inferSelect;
