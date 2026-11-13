import type { CheckDto, CheckStatus } from './check.js';
import type { IncidentDto } from './incident.js';
import type { MonitorDto, MonitorStatus } from './monitor.js';

export const LIVE_NAMESPACE = '/live';

export interface PublicCheckEvent {
  monitorId: string;
  status: CheckStatus;
  monitorStatus: MonitorStatus;
  responseMs: number | null;
  checkedAt: string;
}

/**
 * Typed contract for Socket.IO. Admin events go to authenticated sockets only,
 * `status:*` events are safe for the public page (no URLs, no error details).
 */
export interface ServerToClientEvents {
  'monitor:checked': (payload: { monitor: MonitorDto; check: CheckDto }) => void;
  'monitor:saved': (monitor: MonitorDto) => void;
  'monitor:removed': (payload: { id: string }) => void;
  'incident:opened': (incident: IncidentDto) => void;
  'incident:resolved': (incident: IncidentDto) => void;

  'status:checked': (payload: PublicCheckEvent) => void;
  /** Something structural changed (status, incident, visibility) – refetch the page. */
  'status:invalidated': () => void;
}

// biome-ignore lint/complexity/noBannedTypes: no client-to-server events yet
export type ClientToServerEvents = {};
