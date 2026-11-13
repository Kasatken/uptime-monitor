import type { CheckDto, CheckStatus } from './check.js';
import type { IncidentDto } from './incident.js';
import type { MonitorDto, MonitorStatus } from './monitor.js';

export const LIVE_PATH = '/api/live';

export interface PublicCheckEvent {
  monitorId: string;
  status: CheckStatus;
  monitorStatus: MonitorStatus;
  responseMs: number | null;
  checkedAt: string;
}

/**
 * Everything the server can push. `monitor:*` and `incident:*` go to signed-in
 * sockets only; `status:*` is safe for the public page (no URLs, no error details).
 */
export interface LiveEvents {
  'monitor:checked': { monitor: MonitorDto; check: CheckDto };
  'monitor:saved': MonitorDto;
  'monitor:removed': { id: string };
  'incident:opened': IncidentDto;
  'incident:resolved': IncidentDto;
  'status:checked': PublicCheckEvent;
  'status:invalidated': null;
}

export type LiveEventType = keyof LiveEvents;

/** One frame on the wire: JSON `{ type, data }`, discriminated by `type`. */
export type LiveMessage = {
  [K in LiveEventType]: { type: K; data: LiveEvents[K] };
}[LiveEventType];
