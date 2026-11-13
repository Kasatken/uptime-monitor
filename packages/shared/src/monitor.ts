import { z } from 'zod';

export const MONITOR_TYPES = ['http', 'tcp', 'heartbeat'] as const;
export type MonitorType = (typeof MONITOR_TYPES)[number];

export const MONITOR_STATUSES = ['pending', 'up', 'degraded', 'down', 'paused'] as const;
export type MonitorStatus = (typeof MONITOR_STATUSES)[number];

export const INTERVAL_PRESETS = [30, 60, 300, 600, 1800, 3600] as const;

const timeoutMs = z
  .number({ error: 'Укажите число' })
  .int()
  .min(1_000, 'Не меньше 1000 мс')
  .max(30_000, 'Не больше 30 000 мс');
const degradedAfterMs = z.number().int().min(50).max(30_000).optional();

const STATUS_SPEC = /^\s*\d{3}(\s*-\s*\d{3})?(\s*,\s*\d{3}(\s*-\s*\d{3})?)*\s*$/;

export const httpConfigSchema = z.object({
  url: z.url({
    protocol: /^https?$/,
    error: 'Введите полный адрес, начиная с http:// или https://',
  }),
  method: z.enum(['GET', 'HEAD']).default('GET'),
  expectedStatus: z
    .string()
    .regex(STATUS_SPEC, 'Коды или диапазоны через запятую, например 200-299, 301')
    .default('200-299'),
  keyword: z.string().trim().max(200).optional(),
  timeoutMs: timeoutMs.default(10_000),
  degradedAfterMs,
});

export const tcpConfigSchema = z.object({
  host: z.string().trim().min(1, 'Укажите хост').max(253),
  port: z
    .number({ error: 'Укажите порт' })
    .int()
    .min(1, 'Порт от 1 до 65535')
    .max(65_535, 'Порт от 1 до 65535'),
  timeoutMs: timeoutMs.default(5_000),
  degradedAfterMs,
});

export const heartbeatConfigSchema = z.object({
  graceSeconds: z.number().int().min(0).max(86_400).default(60),
});

export type HttpConfig = z.output<typeof httpConfigSchema>;
export type TcpConfig = z.output<typeof tcpConfigSchema>;
export type HeartbeatConfig = z.output<typeof heartbeatConfigSchema>;

export interface MonitorConfigMap {
  http: HttpConfig;
  tcp: TcpConfig;
  heartbeat: HeartbeatConfig;
}
export type MonitorConfig = MonitorConfigMap[MonitorType];

export const monitorConfigSchemas = {
  http: httpConfigSchema,
  tcp: tcpConfigSchema,
  heartbeat: heartbeatConfigSchema,
} satisfies Record<MonitorType, z.ZodType>;

/*
 * Fields are declared without defaults on purpose: in zod 4 a `.default()` also fires
 * inside `.partial()`, which would silently reset values on PATCH.
 */
const monitorFields = {
  name: z.string().trim().min(1, 'Введите название').max(80),
  intervalSeconds: z.number().int().min(20, 'Минимальный интервал — 20 секунд').max(86_400),
  failureThreshold: z
    .number({ error: 'Укажите число' })
    .int()
    .min(1, 'От 1 до 10')
    .max(10, 'От 1 до 10'),
  isPublic: z.boolean(),
  publicName: z.string().trim().max(80).nullable(),
};

const createBase = z.object({
  ...monitorFields,
  failureThreshold: monitorFields.failureThreshold.default(2),
  isPublic: monitorFields.isPublic.default(false),
  publicName: monitorFields.publicName.optional(),
});

export const createMonitorSchema = z.discriminatedUnion('type', [
  createBase.extend({ type: z.literal('http'), config: httpConfigSchema }),
  createBase.extend({ type: z.literal('tcp'), config: tcpConfigSchema }),
  createBase.extend({ type: z.literal('heartbeat'), config: heartbeatConfigSchema }),
]);
export type CreateMonitorInput = z.output<typeof createMonitorSchema>;
export type CreateMonitorFormValues = z.input<typeof createMonitorSchema>;

export const updateMonitorSchema = z
  .object(monitorFields)
  .partial()
  .extend({ config: z.record(z.string(), z.unknown()).optional() });
export type UpdateMonitorInput = z.output<typeof updateMonitorSchema>;

interface MonitorDtoBase {
  id: string;
  name: string;
  intervalSeconds: number;
  failureThreshold: number;
  isPublic: boolean;
  publicName: string | null;
  status: MonitorStatus;
  lastCheckedAt: string | null;
  lastResponseMs: number | null;
  lastMessage: string | null;
  sslExpiresAt: string | null;
  heartbeatToken: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export type MonitorDto = {
  [K in MonitorType]: MonitorDtoBase & { type: K; config: MonitorConfigMap[K] };
}[MonitorType];
