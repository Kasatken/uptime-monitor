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

  it('takes the port from PORT when API_PORT is not set', () => {
    const base = { ADMIN_PASSWORD: 'password-123', JWT_SECRET: 'x'.repeat(20) };
    expect(AppConfig.fromEnv({ ...base, PORT: '10000' }).port).toBe(10000);
    expect(AppConfig.fromEnv({ ...base, PORT: '10000', API_PORT: '3000' }).port).toBe(3000);
    expect(AppConfig.fromEnv(base).port).toBe(3000);
  });

  it('reads TRUST_PROXY as a hop count or an Express preset', () => {
    const base = { ADMIN_PASSWORD: 'password-123', JWT_SECRET: 'x'.repeat(20) };
    expect(AppConfig.fromEnv({ ...base, TRUST_PROXY: '1' }).trustProxy).toBe(1);
    expect(AppConfig.fromEnv(base).trustProxy).toBe('loopback');
  });

  it('falls back to the Render address when APP_URL is not set', () => {
    const config = AppConfig.fromEnv({
      ADMIN_PASSWORD: 'password-123',
      JWT_SECRET: 'x'.repeat(20),
      RENDER_EXTERNAL_URL: 'https://vigil-abc.onrender.com',
    });
    expect(config.appOrigin).toBe('https://vigil-abc.onrender.com');
  });
});
