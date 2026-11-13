import { DiscoveryService } from '@nestjs/core';
import type { CheckStatus, MonitorConfigMap, MonitorType } from '@vigil/shared';
import type { MonitorRecord } from '../../database/schema.js';

export interface CheckOutcome {
  status: CheckStatus;
  responseMs: number | null;
  statusCode?: number;
  message?: string;
  /** undefined = this checker doesn't know about certificates, keep the stored value */
  sslExpiresAt?: Date | null;
}

/** A monitor record with `config` narrowed to the checker's type. */
export type MonitorOf<T extends MonitorType> = Omit<MonitorRecord, 'type' | 'config'> & {
  type: T;
  config: MonitorConfigMap[T];
};

/**
 * Strategy for one monitor type. Adding a new type (DNS, ICMP, gRPC...) means
 * writing one class with the `@MonitorChecker('type')` decorator – the registry
 * finds it automatically, nothing else has to change.
 *
 * Return `null` when there is nothing to report yet (e.g. a heartbeat that
 * hasn't been due yet) – no check row is written in that case.
 */
export interface Checker<T extends MonitorType = MonitorType> {
  check(monitor: MonitorOf<T>, signal: AbortSignal): Promise<CheckOutcome | null>;
}

export const MonitorChecker = DiscoveryService.createDecorator<MonitorType>();
