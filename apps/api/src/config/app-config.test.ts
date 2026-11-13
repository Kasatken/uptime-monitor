import { describe, expect, it } from 'vitest';
import { AppConfig } from './app-config.js';

const strong = {
  ADMIN_PASSWORD: 'correct-horse-battery',
  JWT_SECRET: 'x'.repeat(40),
  APP_URL: 'https://status.example.com',
};

describe('AppConfig', () => {
  it('accepts placeholder values in development', () => {
    const config = AppConfig.fromEnv({
      ADMIN_PASSWORD: 'change-me-please',
      JWT_SECRET: 'replace-with-a-long-random-string',
    });
    expect(config.cookieSecure).toBe(false);
  });

  it('refuses .env.example placeholders in production', () => {
    expect(() =>
      AppConfig.fromEnv({
        ...strong,
        NODE_ENV: 'production',
        ADMIN_PASSWORD: 'change-me-please',
        JWT_SECRET: 'replace-with-a-long-random-string',
      }),
    ).toThrow(/ADMIN_PASSWORD[\s\S]*JWT_SECRET/);
  });

  it('requires https in production', () => {
    expect(() =>
      AppConfig.fromEnv({ ...strong, NODE_ENV: 'production', APP_URL: 'http://example.com' }),
    ).toThrow(/APP_URL/);
  });

  it('derives the secure cookie flag and origin from APP_URL', () => {
    const config = AppConfig.fromEnv({
      ...strong,
      NODE_ENV: 'production',
      APP_URL: 'https://status.example.com/',
    });
    expect(config.cookieSecure).toBe(true);
    expect(config.appOrigin).toBe('https://status.example.com');
  });
});
