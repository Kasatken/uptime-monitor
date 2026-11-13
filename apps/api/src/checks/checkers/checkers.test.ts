import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { MonitorConfigMap, MonitorType } from '@vigil/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MonitorOf } from './checker.js';
import { HeartbeatChecker } from './heartbeat.checker.js';
import { HttpChecker } from './http.checker.js';
import { TcpChecker } from './tcp.checker.js';
import type { TlsCertificateProbe } from './tls-certificate.probe.js';

function monitorOf<T extends MonitorType>(
  type: T,
  config: MonitorConfigMap[T],
  overrides: Partial<MonitorOf<T>> = {},
): MonitorOf<T> {
  return {
    id: 'test',
    name: 'test',
    type,
    config,
    intervalSeconds: 60,
    failureThreshold: 2,
    isPublic: false,
    publicName: null,
    status: 'up',
    failStreak: 0,
    lastCheckedAt: null,
    lastResponseMs: null,
    lastMessage: null,
    sslExpiresAt: null,
    heartbeatToken: null,
    lastHeartbeatAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const signal = new AbortController().signal;

/** A port that was free a moment ago – nothing listens on it. */
async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

describe('HttpChecker (against a local server)', () => {
  let server: Server;
  let baseUrl: string;
  const noCertificates = { expiryFor: async () => null } as unknown as TlsCertificateProbe;
  const checker = new HttpChecker(noCertificates);

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/slow') {
        setTimeout(() => res.end('late'), 300);
        return;
      }
      if (req.url === '/missing') {
        res.statusCode = 404;
        res.end('not here');
        return;
      }
      res.end('<h1>Welcome to the shop</h1>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const http = (path: string, extra: Partial<MonitorConfigMap['http']> = {}) =>
    monitorOf('http', {
      url: `${baseUrl}${path}`,
      method: 'GET',
      expectedStatus: '200-299',
      timeoutMs: 2000,
      ...extra,
    });

  it('is up for an expected status', async () => {
    const outcome = await checker.check(http('/'), signal);
    expect(outcome).toMatchObject({ status: 'up', statusCode: 200 });
    expect(outcome.responseMs).toBeGreaterThanOrEqual(0);
  });

  it('is down for an unexpected status', async () => {
    const outcome = await checker.check(http('/missing'), signal);
    expect(outcome).toMatchObject({ status: 'down', statusCode: 404 });
    expect(outcome.message).toContain('got 404');
  });

  it('checks the keyword in the body', async () => {
    expect((await checker.check(http('/', { keyword: 'shop' }), signal)).status).toBe('up');
    const missing = await checker.check(http('/', { keyword: 'checkout' }), signal);
    expect(missing).toMatchObject({
      status: 'down',
      message: 'Keyword "checkout" not found in response',
    });
  });

  it('is degraded when slower than the threshold', async () => {
    const outcome = await checker.check(http('/slow', { degradedAfterMs: 100 }), signal);
    expect(outcome.status).toBe('degraded');
  });

  it('is down on timeout', async () => {
    const outcome = await checker.check(http('/slow', { timeoutMs: 100 }), signal);
    expect(outcome).toMatchObject({ status: 'down', message: 'Timed out after 100 ms' });
  });

  it('explains ports that fetch refuses to use', async () => {
    const outcome = await checker.check(
      monitorOf('http', {
        url: 'http://127.0.0.1:1/',
        method: 'GET',
        expectedStatus: '200',
        timeoutMs: 1000,
      }),
      signal,
    );
    expect(outcome.message).toMatch(/use a TCP monitor/);
  });

  it('describes connection errors', async () => {
    const outcome = await checker.check(
      monitorOf('http', {
        url: `http://127.0.0.1:${await closedPort()}/`,
        method: 'GET',
        expectedStatus: '200',
        timeoutMs: 2000,
      }),
      signal,
    );
    expect(outcome).toMatchObject({ status: 'down', message: 'Connection refused' });
  });
});

describe('TcpChecker', () => {
  const checker = new TcpChecker();

  it('connects to an open port', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const outcome = await checker.check(
      monitorOf('tcp', { host: '127.0.0.1', port, timeoutMs: 2000 }),
      signal,
    );
    server.close();
    expect(outcome.status).toBe('up');
  });

  it('reports a refused connection', async () => {
    const outcome = await checker.check(
      monitorOf('tcp', { host: '127.0.0.1', port: 1, timeoutMs: 2000 }),
      signal,
    );
    expect(outcome).toMatchObject({ status: 'down', message: 'Connection refused' });
  });
});

describe('HeartbeatChecker', () => {
  const checker = new HeartbeatChecker();
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

  it('reports nothing before the first ping is due', async () => {
    const monitor = monitorOf('heartbeat', { graceSeconds: 60 }, { createdAt: minutesAgo(1) });
    expect(await checker.check(monitor)).toBeNull();
  });

  it('is up when the last ping is recent', async () => {
    const monitor = monitorOf(
      'heartbeat',
      { graceSeconds: 60 },
      { lastHeartbeatAt: minutesAgo(1) },
    );
    expect(await checker.check(monitor)).toMatchObject({ status: 'up' });
  });

  it('is down when pings stop', async () => {
    const monitor = monitorOf(
      'heartbeat',
      { graceSeconds: 60 },
      { lastHeartbeatAt: minutesAgo(10), intervalSeconds: 300 },
    );
    expect(await checker.check(monitor)).toMatchObject({
      status: 'down',
      message: 'No ping for 10m',
    });
  });

  it('is down when the job never pinged at all', async () => {
    const monitor = monitorOf('heartbeat', { graceSeconds: 0 }, { createdAt: minutesAgo(5) });
    expect(await checker.check(monitor)).toMatchObject({ message: 'No ping received yet' });
  });
});
