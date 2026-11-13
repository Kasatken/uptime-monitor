export interface IncidentDto {
  id: string;
  monitorId: string;
  monitorName: string;
  startedAt: string;
  resolvedAt: string | null;
  /** First failure message, e.g. "Connection refused" */
  cause: string | null;
}

/** What the public status page is allowed to know about an incident. */
export type PublicIncidentDto = Omit<IncidentDto, 'cause'>;
