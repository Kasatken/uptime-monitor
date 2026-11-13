import { randomBytes } from 'node:crypto';
import type { MonitorConfig, MonitorType } from '@vigil/shared';
import { formatDuration } from '@vigil/shared';
import { AppConfig } from '../config/app-config.js';
import { connectDatabase } from '../database/database.js';
import {
  type CheckRecord,
  checks,
  incidents,
  monitorDailyStats,
  monitors,
  type NewMonitorRecord,
} from '../database/schema.js';

/*
 * Fills the database with 90 days of believable, synthetic history so the UI can be shown
 * without waiting three months. Stop the dev server first: PGlite allows one process per folder.
 *
 *   npm run seed:demo -w @vigil/api            # only into an empty database
 *   npm run seed:demo -w @vigil/api -- --reset # wipe existing monitors first
 */

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const HISTORY_DAYS = 90;

// Seeded PRNG: the same data on every run, so screenshots are reproducible
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(42);

interface PastIncident {
  daysAgo: number;
  hour: number;
  minutes: number;
  cause: string;
}

interface DemoMonitor {
  name: string;
  type: MonitorType;
  config: MonitorConfig;
  intervalSeconds: number;
  publicName?: string;
  failureThreshold?: number;
  baseMs: number | null;
  incidents: PastIncident[];
  /** Down right now, for this many minutes */
  downForMinutes?: number;
}

const DEMO: DemoMonitor[] = [
  {
    name: 'Интернет-магазин',
    publicName: 'Магазин',
    type: 'http',
    config: {
      url: 'https://example.com',
      method: 'GET',
      expectedStatus: '200-299',
      timeoutMs: 10_000,
    },
    intervalSeconds: 60,
    baseMs: 240,
    incidents: [
      { daysAgo: 6, hour: 14, minutes: 7, cause: 'Ожидался код 200-299, получен 502' },
      { daysAgo: 38, hour: 2, minutes: 23, cause: 'Нет ответа за 10000 мс' },
    ],
  },
  {
    name: 'API платежей',
    publicName: 'API',
    type: 'http',
    config: {
      url: 'https://www.wikipedia.org',
      method: 'GET',
      expectedStatus: '200-299',
      keyword: 'Wikipedia',
      timeoutMs: 10_000,
      degradedAfterMs: 1500,
    },
    intervalSeconds: 60,
    baseMs: 330,
    incidents: [
      { daysAgo: 2, hour: 11, minutes: 12, cause: 'Ожидался код 200-299, получен 503' },
      { daysAgo: 61, hour: 19, minutes: 54, cause: 'Соединение сброшено сервером' },
    ],
  },
  {
    name: 'Личный блог',
    publicName: 'Блог',
    type: 'http',
    config: {
      url: 'https://example.org',
      method: 'GET',
      expectedStatus: '200-299',
      timeoutMs: 10_000,
    },
    intervalSeconds: 120,
    baseMs: 180,
    incidents: [{ daysAgo: 11, hour: 9, minutes: 4, cause: 'Домен не найден (DNS)' }],
  },
  {
    name: 'VPS · DNS-резолвер',
    publicName: 'DNS',
    type: 'tcp',
    config: { host: '1.1.1.1', port: 53, timeoutMs: 5_000 },
    intervalSeconds: 60,
    baseMs: 18,
    incidents: [{ daysAgo: 27, hour: 4, minutes: 3, cause: 'Не удалось подключиться вовремя' }],
  },
  {
    name: 'Ночной бэкап',
    type: 'heartbeat',
    config: { graceSeconds: 1800 },
    intervalSeconds: 86_400,
    failureThreshold: 1,
    baseMs: null,
    incidents: [{ daysAgo: 19, hour: 4, minutes: 26 * 60, cause: 'Нет сигнала уже 1 д 2 ч' }],
  },
  {
    name: 'Тестовый стенд',
    type: 'tcp',
    config: { host: '127.0.0.1', port: 5999, timeoutMs: 5_000 },
    intervalSeconds: 60,
    failureThreshold: 1,
    baseMs: 3,
    incidents: [{ daysAgo: 4, hour: 16, minutes: 95, cause: 'Соединение отклонено' }],
    downForMinutes: 47,
  },
];

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function responseTime(base: number, at: number): number {
  const hour = new Date(at).getUTCHours();
  const dailyWave = 1 + 0.18 * Math.sin(((hour - 8) / 24) * 2 * Math.PI);
  const noise = 0.85 + random() * 0.3;
  const spike = random() < 0.01 ? 2.5 + random() * 2 : 1;
  return Math.round(base * dailyWave * noise * spike);
}

function incidentWindow(incident: PastIncident, now: number) {
  const day = new Date(now - incident.daysAgo * DAY_MS);
  day.setUTCHours(incident.hour, Math.floor(random() * 50), 0, 0);
  const start = day.getTime();
  return { start, end: start + incident.minutes * MINUTE_MS };
}

async function main() {
  const config = AppConfig.fromEnv();
  const { db, close } = await connectDatabase(config.database);
  const reset = process.argv.includes('--reset');

  try {
    const existing = await db.select({ id: monitors.id }).from(monitors);
    if (existing.length > 0 && !reset) {
      console.error('The database already has monitors. Run with --reset to replace them.');
      process.exitCode = 1;
      return;
    }
    if (reset) await db.delete(monitors);

    const now = Date.now();

    for (const demo of DEMO) {
      const windows = demo.incidents.map((incident) => ({
        ...incidentWindow(incident, now),
        cause: incident.cause,
      }));
      const ongoingSince = demo.downForMinutes ? now - demo.downForMinutes * MINUTE_MS : null;
      const isDown = (at: number) =>
        (ongoingSince !== null && at >= ongoingSince) ||
        windows.some((w) => at >= w.start && at < w.end);

      // Raw checks for the last 24 hours (heartbeats: one per day)
      const step = demo.intervalSeconds * 1000;
      const rawChecks: Array<Omit<CheckRecord, 'id' | 'monitorId'>> = [];
      for (let at = now - Math.min(DAY_MS, step * 1440); at <= now; at += step) {
        const down = isDown(at);
        rawChecks.push({
          status: down ? 'down' : 'up',
          responseMs: down || demo.baseMs === null ? null : responseTime(demo.baseMs, at),
          statusCode: demo.type === 'http' && !down ? 200 : null,
          message: down
            ? ongoingSince !== null && at >= ongoingSince
              ? 'Соединение отклонено'
              : 'Ошибка'
            : null,
          checkedAt: new Date(at),
        });
      }
      const last = rawChecks.at(-1);

      const heartbeatToken =
        demo.type === 'heartbeat' ? randomBytes(18).toString('base64url') : null;
      const lastHeartbeatAt = demo.type === 'heartbeat' ? new Date(now - 9 * 3_600_000) : null;

      const values: NewMonitorRecord = {
        name: demo.name,
        type: demo.type,
        config: demo.config,
        intervalSeconds: demo.intervalSeconds,
        failureThreshold: demo.failureThreshold ?? 2,
        isPublic: demo.publicName !== undefined,
        publicName: demo.publicName ?? null,
        status: ongoingSince ? 'down' : 'up',
        failStreak: ongoingSince
          ? Math.round(((demo.downForMinutes ?? 0) * 60) / demo.intervalSeconds)
          : 0,
        lastCheckedAt: last?.checkedAt ?? null,
        lastResponseMs: last?.responseMs ?? null,
        lastMessage: last?.message ?? null,
        sslExpiresAt: demo.type === 'http' ? new Date(now + 64 * DAY_MS) : null,
        heartbeatToken,
        lastHeartbeatAt,
        createdAt: new Date(now - HISTORY_DAYS * DAY_MS),
      };
      const [monitor] = await db.insert(monitors).values(values).returning();
      if (!monitor) throw new Error('insert failed');

      for (let i = 0; i < rawChecks.length; i += 500) {
        await db
          .insert(checks)
          .values(rawChecks.slice(i, i + 500).map((c) => ({ ...c, monitorId: monitor.id })));
      }

      // Daily rollups: synthetic counts for past days, real counts for today
      const perDay = Math.max(1, Math.round(DAY_MS / step));
      const todayKey = utcDay(now);
      const stats = Array.from({ length: HISTORY_DAYS }, (_, i) => {
        const dayStart = new Date(utcDay(now - (HISTORY_DAYS - 1 - i) * DAY_MS)).getTime();
        const day = utcDay(dayStart);
        if (day === todayKey) {
          const today = rawChecks.filter((c) => utcDay(c.checkedAt.getTime()) === todayKey);
          const timed = today.filter((c) => c.responseMs !== null);
          return {
            monitorId: monitor.id,
            day,
            totalChecks: today.length,
            downChecks: today.filter((c) => c.status === 'down').length,
            responseMsSum: timed.reduce((sum, c) => sum + (c.responseMs ?? 0), 0),
            responseSamples: timed.length,
          };
        }
        const downMs = windows.reduce((sum, w) => {
          const overlap = Math.min(w.end, dayStart + DAY_MS) - Math.max(w.start, dayStart);
          return sum + Math.max(0, overlap);
        }, 0);
        const downChecks = Math.min(perDay, Math.ceil(downMs / step));
        const samples = demo.baseMs === null ? 0 : perDay - downChecks;
        return {
          monitorId: monitor.id,
          day,
          totalChecks: perDay,
          downChecks,
          responseMsSum: samples * (demo.baseMs ?? 0) * (0.95 + random() * 0.15),
          responseSamples: samples,
        };
      });
      await db
        .insert(monitorDailyStats)
        .values(stats.map((s) => ({ ...s, responseMsSum: Math.round(s.responseMsSum) })));

      const incidentRows: Array<typeof incidents.$inferInsert> = windows.map((w) => ({
        monitorId: monitor.id,
        startedAt: new Date(w.start),
        resolvedAt: new Date(w.end),
        cause: w.cause,
      }));
      if (ongoingSince) {
        incidentRows.push({
          monitorId: monitor.id,
          startedAt: new Date(ongoingSince),
          resolvedAt: null,
          cause: 'Соединение отклонено',
        });
      }
      if (incidentRows.length) await db.insert(incidents).values(incidentRows);

      const longest = Math.max(...windows.map((w) => w.end - w.start), 0);
      console.log(
        `✓ ${demo.name}: ${rawChecks.length} checks, ${incidentRows.length} incidents (longest ${formatDuration(longest)})`,
      );
    }
    console.log('\nDemo data is ready. Start the app with `npm run dev`.');
  } finally {
    await close();
  }
}

void main();
