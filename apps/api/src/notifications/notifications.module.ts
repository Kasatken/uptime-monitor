import { Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config.js';
import { TelegramNotifier } from './channels/telegram.notifier.js';
import { WebhookNotifier } from './channels/webhook.notifier.js';
import { NotificationsService } from './notifications.service.js';
import { NOTIFIERS, type Notifier } from './notifier.js';

@Module({
  providers: [
    {
      provide: NOTIFIERS,
      inject: [AppConfig],
      useFactory: ({ alerts }: AppConfig): Notifier[] => {
        const notifiers: Notifier[] = [];
        if (alerts.telegram) notifiers.push(new TelegramNotifier(alerts.telegram));
        if (alerts.webhookUrl) notifiers.push(new WebhookNotifier(alerts.webhookUrl));
        return notifiers;
      },
    },
    NotificationsService,
  ],
})
export class NotificationsModule {}
