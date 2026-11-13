import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().default(3000),
  APP_URL: z.url().default('http://localhost:5173'),

  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  DATABASE_URL: optionalString,
  PGLITE_DIR: z.string().default('./.data/pglite'),

  CHECK_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(10),
  CHECK_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),

  STATUS_PAGE_TITLE: z.string().default('Статус сервисов'),
  WEB_DIST_DIR: optionalString,

  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  ALERT_WEBHOOK_URL: z.preprocess(emptyToUndefined, z.url().optional()),
});

// Values copied from .env.example must never reach a real server.
const PLACEHOLDERS = new Set(['change-me-please', 'replace-with-a-long-random-string']);

const productionSchema = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  if (PLACEHOLDERS.has(env.ADMIN_PASSWORD) || env.ADMIN_PASSWORD.length < 12) {
    ctx.addIssue({
      code: 'custom',
      path: ['ADMIN_PASSWORD'],
      message: 'set a real password, at least 12 characters',
    });
  }
  if (PLACEHOLDERS.has(env.JWT_SECRET) || env.JWT_SECRET.length < 32) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_SECRET'],
      message: 'use at least 32 random characters: openssl rand -base64 32',
    });
  }
  if (!env.APP_URL.startsWith('https://')) {
    ctx.addIssue({ code: 'custom', path: ['APP_URL'], message: 'must be https:// in production' });
  }
});

export class AppConfig {
  readonly isProduction: boolean;
  readonly port: number;
  readonly appUrl: string;
  readonly appOrigin: string;
  readonly cookieSecure: boolean;
  readonly webDistDir?: string;
  readonly adminPassword: string;
  readonly jwtSecret: string;
  readonly database: { url?: string; pgliteDir: string };
  readonly checks: { concurrency: number; retentionDays: number };
  readonly statusPageTitle: string;
  readonly alerts: {
    telegram?: { botToken: string; chatId: string };
    webhookUrl?: string;
  };

  private constructor(env: z.output<typeof envSchema>) {
    this.isProduction = env.NODE_ENV === 'production';
    this.port = env.API_PORT;
    this.appUrl = env.APP_URL.replace(/\/$/, '');
    this.appOrigin = new URL(env.APP_URL).origin;
    this.cookieSecure = env.APP_URL.startsWith('https://');
    this.webDistDir = env.WEB_DIST_DIR;
    this.adminPassword = env.ADMIN_PASSWORD;
    this.jwtSecret = env.JWT_SECRET;
    this.database = { url: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR };
    this.checks = { concurrency: env.CHECK_CONCURRENCY, retentionDays: env.CHECK_RETENTION_DAYS };
    this.statusPageTitle = env.STATUS_PAGE_TITLE;
    this.alerts = {
      telegram:
        env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
          ? { botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID }
          : undefined,
      webhookUrl: env.ALERT_WEBHOOK_URL,
    };
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const result = productionSchema.safeParse(env);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${details}`);
    }
    return new AppConfig(result.data);
  }
}
