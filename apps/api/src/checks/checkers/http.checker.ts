import { Injectable } from '@nestjs/common';
import { daysUntil } from '../../common/time.js';
import { type Checker, type CheckOutcome, MonitorChecker, type MonitorOf } from './checker.js';
import { matchesStatusSpec } from './http-status.js';
import { describeNetworkError } from './network-errors.js';
import { TlsCertificateProbe } from './tls-certificate.probe.js';

const USER_AGENT = 'VigilUptimeMonitor/1.0 (+https://github.com/)';
const SSL_WARNING_DAYS = 7;
export const MAX_BODY_BYTES = 1024 * 1024;

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

      if (keyword && method === 'GET') body = await readText(response, MAX_BODY_BYTES);
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
        message: `Ожидался код ${expectedStatus}, получен ${statusCode}`,
      };
    }
    if (keyword && method === 'GET' && !body.includes(keyword)) {
      return { ...base, status: 'down', message: `На странице нет текста «${keyword}»` };
    }

    const sslExpiresAt = url.startsWith('https:') ? await this.certificates.expiryFor(url) : null;
    const sslDaysLeft = sslExpiresAt ? daysUntil(sslExpiresAt) : null;

    if (sslDaysLeft !== null && sslDaysLeft <= SSL_WARNING_DAYS) {
      return {
        ...base,
        status: 'degraded',
        sslExpiresAt,
        message: `SSL-сертификат истекает через ${Math.max(sslDaysLeft, 0)} дн.`,
      };
    }
    if (degradedAfterMs && responseMs > degradedAfterMs) {
      return {
        ...base,
        status: 'degraded',
        sslExpiresAt,
        message: `Медленный ответ: ${responseMs} мс при пороге ${degradedAfterMs} мс`,
      };
    }
    return { ...base, status: 'up', sslExpiresAt };
  }
}

// The keyword search reads at most `limit` bytes, so a huge or endless page cannot eat the memory.
async function readText(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let text = '';
  let received = 0;
  while (received < limit) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel();
  return text;
}
