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

  STATUS_PAGE_TITLE: z.string().default('Vigil Status'),

  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  ALERT_WEBHOOK_URL: z.preprocess(emptyToUndefined, z.url().optional()),
});

/**
 * Typed, validated config. Injected as a class so consumers don't depend on
 * string keys or `process.env` directly.
 */
export class AppConfig {
  readonly isProduction: boolean;
  readonly port: number;
  readonly appUrl: string;
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
    const result = envSchema.safeParse(env);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${details}`);
    }
    return new AppConfig(result.data);
  }
}
