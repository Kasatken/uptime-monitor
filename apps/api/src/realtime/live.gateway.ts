import { OnEvent } from '@nestjs/event-emitter';
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import {
  type ClientToServerEvents,
  type IncidentDto,
  LIVE_NAMESPACE,
  type ServerToClientEvents,
} from '@vigil/shared';
import type { Namespace, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { toCheckDto } from '../checks/check.mapper.js';
import {
  type CheckCompletedEvent,
  DomainEvent,
  type IncidentEvent,
  type MonitorRemovedEvent,
  type MonitorSavedEvent,
} from '../events/domain-events.js';
import { toMonitorDto } from '../monitors/monitor.mapper.js';

const Room = {
  /** Everyone, including anonymous visitors of the status page */
  Public: 'public',
  /** Sockets that presented a valid session cookie during the handshake */
  Admin: 'admin',
} as const;

type LiveSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Bridges domain events to browsers. It only translates events into socket
 * messages; nothing here touches the database.
 */
@WebSocketGateway({ namespace: LIVE_NAMESPACE })
export class LiveGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Namespace<ClientToServerEvents, ServerToClientEvents>;

  constructor(private readonly auth: AuthService) {}

  async handleConnection(socket: LiveSocket) {
    await socket.join(Room.Public);
    if (this.auth.isValidCookieHeader(socket.handshake.headers.cookie)) {
      await socket.join(Room.Admin);
    }
  }

  @OnEvent(DomainEvent.CheckCompleted)
  handleCheckCompleted({ monitor, check }: CheckCompletedEvent) {
    this.server.to(Room.Admin).emit('monitor:checked', {
      monitor: toMonitorDto(monitor),
      check: toCheckDto(check),
    });

    if (monitor.isPublic) {
      this.server.to(Room.Public).emit('status:checked', {
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
    this.server.to(Room.Admin).emit('monitor:saved', toMonitorDto(monitor));
    // name or visibility might have changed
    this.server.to(Room.Public).emit('status:invalidated');
  }

  @OnEvent(DomainEvent.MonitorRemoved)
  handleMonitorRemoved({ id }: MonitorRemovedEvent) {
    this.server.to(Room.Admin).emit('monitor:removed', { id });
    this.server.to(Room.Public).emit('status:invalidated');
  }

  @OnEvent(DomainEvent.IncidentOpened)
  handleIncidentOpened(event: IncidentEvent) {
    this.server.to(Room.Admin).emit('incident:opened', this.toIncidentDto(event));
    if (event.monitor.isPublic) this.server.to(Room.Public).emit('status:invalidated');
  }

  @OnEvent(DomainEvent.IncidentResolved)
  handleIncidentResolved(event: IncidentEvent) {
    this.server.to(Room.Admin).emit('incident:resolved', this.toIncidentDto(event));
    if (event.monitor.isPublic) this.server.to(Room.Public).emit('status:invalidated');
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
