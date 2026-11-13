import { alertLines, alertTitle } from '../alert-text.js';
import { type Alert, NOTIFY_TIMEOUT_MS, type Notifier } from '../notifier.js';

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export class TelegramNotifier implements Notifier {
  readonly name = 'telegram';

  constructor(private readonly options: { botToken: string; chatId: string }) {}

  async send(alert: Alert): Promise<void> {
    const text = [
      `<b>${escapeHtml(alertTitle(alert))}</b>`,
      ...alertLines(alert).map(escapeHtml),
    ].join('\n');

    const response = await fetch(
      `https://api.telegram.org/bot${this.options.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.options.chatId,
          text,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram responded ${response.status}: ${await response.text()}`);
    }
  }
}
