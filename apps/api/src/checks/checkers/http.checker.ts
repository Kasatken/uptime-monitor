import { Injectable } from '@nestjs/common';
import { daysUntil } from '../../common/time.js';
import { type Checker, type CheckOutcome, MonitorChecker, type MonitorOf } from './checker.js';
import { matchesStatusSpec } from './http-status.js';
import { describeNetworkError } from './network-errors.js';
import { TlsCertificateProbe } from './tls-certificate.probe.js';

const USER_AGENT = 'VigilUptimeMonitor/1.0 (+https://github.com/)';
const SSL_WARNING_DAYS = 7;

@MonitorChecker('http')
@Injectable()
export class HttpChecker implements Checker<'http'> {
  constructor(private readonly certificates: TlsCertificateProbe) {}

  async check(monitor: MonitorOf<'http'>, signal: AbortSignal): Promise<CheckOutcome> {
    const { url, method, keyword, timeoutMs } = monitor.config;
    const startedAt = performance.now();

    let statusCode: number;
    let responseMs: number;
    let body = '';
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
      });
      // Response time = time to headers. Body download depends on page size, not server health.
      responseMs = Math.round(performance.now() - startedAt);
      statusCode = response.status;

      if (keyword && method === 'GET') body = await response.text();
      else await response.body?.cancel();
    } catch (error) {
      return { status: 'down', responseMs: null, message: describeNetworkError(error, timeoutMs) };
    }

    return this.evaluate(monitor, statusCode, responseMs, body);
  }

  private async evaluate(
    monitor: MonitorOf<'http'>,
    statusCode: number,
    responseMs: number,
    body: string,
  ): Promise<CheckOutcome> {
    const { url, expectedStatus, keyword, method, degradedAfterMs } = monitor.config;
    const base = { responseMs, statusCode };

    if (!matchesStatusSpec(statusCode, expectedStatus)) {
      return {
        ...base,
        status: 'down',
        message: `Expected HTTP ${expectedStatus}, got ${statusCode}`,
      };
    }
    if (keyword && method === 'GET' && !body.includes(keyword)) {
      return { ...base, status: 'down', message: `Keyword "${keyword}" not found in response` };
    }

    const sslExpiresAt = url.startsWith('https:') ? await this.certificates.expiryFor(url) : null;
    const sslDaysLeft = sslExpiresAt ? daysUntil(sslExpiresAt) : null;

    if (sslDaysLeft !== null && sslDaysLeft <= SSL_WARNING_DAYS) {
      return {
        ...base,
        status: 'degraded',
        sslExpiresAt,
        message: `SSL certificate expires in ${Math.max(sslDaysLeft, 0)} days`,
      };
    }
    if (degradedAfterMs && responseMs > degradedAfterMs) {
      return {
        ...base,
        status: 'degraded',
        sslExpiresAt,
        message: `Slow response: ${responseMs} ms (limit ${degradedAfterMs} ms)`,
      };
    }
    return { ...base, status: 'up', sslExpiresAt };
  }
}
