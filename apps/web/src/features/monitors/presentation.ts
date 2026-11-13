import type { MonitorDto, MonitorType } from '@vigil/shared';
import { Globe, HeartPulse, type LucideIcon, Server } from 'lucide-react';

export const TYPE_META: Record<
  MonitorType,
  { label: string; Icon: LucideIcon; description: string }
> = {
  http: {
    label: 'HTTP(S)',
    Icon: Globe,
    description: 'Website or API endpoint. Checks status code, keyword and SSL expiry.',
  },
  tcp: {
    label: 'TCP port',
    Icon: Server,
    description: 'Any port on a server: SSH, database, mail, game server.',
  },
  heartbeat: {
    label: 'Heartbeat',
    Icon: HeartPulse,
    description: 'Your cron job or script pings us. Alerts when it stops.',
  },
};

export function describeTarget(monitor: MonitorDto): string {
  switch (monitor.type) {
    case 'http':
      return monitor.config.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    case 'tcp':
      return `${monitor.config.host}:${monitor.config.port}`;
    case 'heartbeat':
      return 'Heartbeat';
  }
}

export const heartbeatUrl = (token: string) => `${window.location.origin}/api/heartbeat/${token}`;
