import type { MonitorDto, MonitorType } from '@vigil/shared';
import { Globe, HeartPulse, type LucideIcon, Server } from 'lucide-react';

export const TYPE_META: Record<
  MonitorType,
  { label: string; Icon: LucideIcon; description: string; fill: string }
> = {
  http: {
    label: 'Сайт или API',
    Icon: Globe,
    description: 'Проверяет код ответа, текст на странице и срок SSL-сертификата.',
    fill: 'bg-lavender',
  },
  tcp: {
    label: 'TCP-порт',
    Icon: Server,
    description: 'Любой порт на сервере: SSH, база данных, почта, игровой сервер.',
    fill: 'bg-mint',
  },
  heartbeat: {
    label: 'Cron-задача',
    Icon: HeartPulse,
    description: 'Ваш скрипт сам присылает сигнал. Пропал сигнал — придёт тревога.',
    fill: 'bg-pink',
  },
};

export function describeTarget(monitor: MonitorDto): string {
  switch (monitor.type) {
    case 'http':
      return monitor.config.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    case 'tcp':
      return `${monitor.config.host}:${monitor.config.port}`;
    case 'heartbeat':
      return 'Ждёт сигнал';
  }
}

export const heartbeatUrl = (token: string) => `${window.location.origin}/api/heartbeat/${token}`;
