export interface Alert {
  kind: 'down' | 'recovered';
  monitorName: string;
  target: string;
  cause: string | null;
  startedAt: Date;
  /** Only for `recovered` */
  downtimeMs?: number;
  link: string;
}

/**
 * One delivery channel. Adding Discord-native embeds, email or ntfy means
 * implementing this interface and registering it in NotificationsModule.
 */
export interface Notifier {
  readonly name: string;
  send(alert: Alert): Promise<void>;
}

export const NOTIFIERS = Symbol('NOTIFIERS');

export const NOTIFY_TIMEOUT_MS = 10_000;
