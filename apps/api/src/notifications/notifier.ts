export interface Alert {
  kind: 'down' | 'recovered';
  monitorName: string;
  target: string;
  cause: string | null;
  startedAt: Date;
  downtimeMs?: number;
  link: string;
}

export interface Notifier {
  readonly name: string;
  send(alert: Alert): Promise<void>;
}

export const NOTIFIERS = Symbol('NOTIFIERS');

export const NOTIFY_TIMEOUT_MS = 10_000;
