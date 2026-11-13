import type { IncomingMessage } from 'node:http';
import type { OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type IncidentDto, LIVE_PATH, type LiveEvents, type LiveEventType } from '@vigil/shared';
import { type Server, WebSocket } from 'ws';
import { AuthService } from '../auth/auth.service.js';
import { toCheckDto } from '../checks/check.mapper.js';
import { AppConfig } from '../config/app-config.js';
import {
  type CheckCompletedEvent,
  DomainEvent,
  type IncidentEvent,
  type MonitorRemovedEvent,
  type MonitorSavedEvent,
} from '../events/domain-events.js';
import { toMonitorDto } from '../monitors/monitor.mapper.js';

const KEEPALIVE_INTERVAL_MS = 30_000;

type Audience = 'everyone' | 'admins';

@WebSocketGateway({ path: LIVE_PATH })
export class LiveGateway implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
  @WebSocketServer()
  private readonly server: Server;

  private readonly admins = new WeakSet<WebSocket>();
  private readonly alive = new WeakSet<WebSocket>();
  private keepalive?: NodeJS.Timeout;

  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  afterInit() {
    this.keepalive = setInterval(() => this.checkAlive(), KEEPALIVE_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.keepalive);
  }

  // The session cookie is read once, at the handshake: that decides what this socket may receive.
  // Browsers attach cookies to WebSocket handshakes from any site, so admin data also requires our
  // own Origin (cross-site WebSocket hijacking). Non-browser clients send no Origin and no cookie.
  handleConnection(socket: WebSocket, request: IncomingMessage) {
    const origin = request.headers.origin;
    const trustedOrigin = origin === undefined || origin === this.config.appOrigin;
    if (trustedOrigin && this.auth.isValidCookieHeader(request.headers.cookie)) {
      this.admins.add(socket);
    }
    this.alive.add(socket);
    socket.on('pong', () => this.alive.add(socket));
  }

  @OnEvent(DomainEvent.CheckCompleted)
  handleCheckCompleted({ monitor, check }: CheckCompletedEvent) {
    this.send('admins', 'monitor:checked', {
      monitor: toMonitorDto(monitor),
      check: toCheckDto(check),
    });

    if (monitor.isPublic) {
      this.send('everyone', 'status:checked', {
        monitorId: monitor.id,
        status: check.status,
        monitorStatus: monitor.status,
        responseMs: check.responseMs,
        checkedAt: check.checkedAt.toISOString(),
      });
    }
  }

  @OnEvent(DomainEvent.MonitorSaved)
  handleMonitorSaved({ monitor }: MonitorSavedEvent) {
    this.send('admins', 'monitor:saved', toMonitorDto(monitor));
    this.send('everyone', 'status:invalidated', null);
  }

  @OnEvent(DomainEvent.MonitorRemoved)
  handleMonitorRemoved({ id }: MonitorRemovedEvent) {
    this.send('admins', 'monitor:removed', { id });
    this.send('everyone', 'status:invalidated', null);
  }

  @OnEvent(DomainEvent.IncidentOpened)
  handleIncidentOpened(event: IncidentEvent) {
    this.send('admins', 'incident:opened', this.toIncidentDto(event));
    if (event.monitor.isPublic) this.send('everyone', 'status:invalidated', null);
  }

  @OnEvent(DomainEvent.IncidentResolved)
  handleIncidentResolved(event: IncidentEvent) {
    this.send('admins', 'incident:resolved', this.toIncidentDto(event));
    if (event.monitor.isPublic) this.send('everyone', 'status:invalidated', null);
  }

  private send<K extends LiveEventType>(audience: Audience, type: K, data: LiveEvents[K]) {
    const frame = JSON.stringify({ type, data });
    for (const socket of this.server.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (audience === 'admins' && !this.admins.has(socket)) continue;
      socket.send(frame);
    }
  }

  // A client that didn't answer the previous ping is gone without a close frame
  // (sleeping laptop, dropped Wi-Fi). Without this its socket would hang around forever.
  private checkAlive() {
    for (const socket of this.server.clients) {
      if (!this.alive.has(socket)) {
        socket.terminate();
        continue;
      }
      this.alive.delete(socket);
      socket.ping();
    }
  }

  private toIncidentDto({ incident, monitor }: IncidentEvent): IncidentDto {
    return {
      id: incident.id,
      monitorId: monitor.id,
      monitorName: monitor.name,
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      cause: incident.cause,
    };
  }
}
