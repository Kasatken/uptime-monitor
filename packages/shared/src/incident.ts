export interface IncidentDto {
  id: string;
  monitorId: string;
  monitorName: string;
  startedAt: string;
  resolvedAt: string | null;
  cause: string | null;
}

export type PublicIncidentDto = Omit<IncidentDto, 'cause'>;
