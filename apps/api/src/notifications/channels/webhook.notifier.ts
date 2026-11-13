import { alertLines, alertTitle } from '../alert-text.js';
import { type Alert, NOTIFY_TIMEOUT_MS, type Notifier } from '../notifier.js';

// `text` is read by Slack, `content` by Discord.
export class WebhookNotifier implements Notifier {
  readonly name = 'webhook';

  constructor(private readonly url: string) {}

  async send(alert: Alert): Promise<void> {
    const text = [alertTitle(alert), ...alertLines(alert)].join('\n');

    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        content: text,
        event: alert.kind === 'down' ? 'monitor.down' : 'monitor.recovered',
        monitor: { name: alert.monitorName, target: alert.target },
        cause: alert.cause,
        startedAt: alert.startedAt.toISOString(),
        downtimeMs: alert.downtimeMs ?? null,
        link: alert.link,
      }),
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
  }
}
