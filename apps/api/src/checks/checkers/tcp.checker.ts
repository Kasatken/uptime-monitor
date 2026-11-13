import net from 'node:net';
import { Injectable } from '@nestjs/common';
import { type Checker, type CheckOutcome, MonitorChecker, type MonitorOf } from './checker.js';
import { describeNetworkError } from './network-errors.js';

@MonitorChecker('tcp')
@Injectable()
export class TcpChecker implements Checker<'tcp'> {
  async check(monitor: MonitorOf<'tcp'>, signal: AbortSignal): Promise<CheckOutcome> {
    const { host, port, timeoutMs, degradedAfterMs } = monitor.config;
    const startedAt = performance.now();

    try {
      await connect(host, port, AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]));
    } catch (error) {
      return { status: 'down', responseMs: null, message: describeNetworkError(error, timeoutMs) };
    }

    const responseMs = Math.round(performance.now() - startedAt);
    if (degradedAfterMs && responseMs > degradedAfterMs) {
      return {
        status: 'degraded',
        responseMs,
        message: `Медленное подключение: ${responseMs} мс при пороге ${degradedAfterMs} мс`,
      };
    }
    return { status: 'up', responseMs };
  }
}

function connect(host: string, port: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port, signal });
    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.once('error', (error) => {
      socket.destroy();
      reject(error);
    });
  });
}
