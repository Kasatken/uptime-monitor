import type { MonitorDto } from '@vigil/shared';
import type { MonitorRecord } from '../database/schema.js';

const iso = (date: Date | null) => date?.toISOString() ?? null;

export function toMonitorDto(record: MonitorRecord): MonitorDto {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    config: record.config,
    intervalSeconds: record.intervalSeconds,
    failureThreshold: record.failureThreshold,
    isPublic: record.isPublic,
    publicName: record.publicName,
    status: record.status,
    lastCheckedAt: iso(record.lastCheckedAt),
    lastResponseMs: record.lastResponseMs,
    lastMessage: record.lastMessage,
    sslExpiresAt: iso(record.sslExpiresAt),
    heartbeatToken: record.heartbeatToken,
    lastHeartbeatAt: iso(record.lastHeartbeatAt),
    createdAt: record.createdAt.toISOString(),
    // `type` and `config` are stored in separate columns, so TS can't see they match
  } as MonitorDto;
}

export function describeTarget(record: MonitorRecord): string {
  const monitor = toMonitorDto(record);
  switch (monitor.type) {
    case 'http':
      return monitor.config.url;
    case 'tcp':
      return `${monitor.config.host}:${monitor.config.port}`;
    case 'heartbeat':
      return 'heartbeat-монитор';
  }
}

export const displayName = (record: MonitorRecord) => record.publicName || record.name;
