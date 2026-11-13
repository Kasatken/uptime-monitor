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

export type MonitorOf<T extends MonitorType> = Omit<MonitorRecord, 'type' | 'config'> & {
  type: T;
  config: MonitorConfigMap[T];
};

// Return null when there is nothing to report yet – no check row is written then.
export interface Checker<T extends MonitorType = MonitorType> {
  check(monitor: MonitorOf<T>, signal: AbortSignal): Promise<CheckOutcome | null>;
}

export const MonitorChecker = DiscoveryService.createDecorator<MonitorType>();
