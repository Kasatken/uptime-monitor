import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import type { AuthService } from '../auth/auth.service.js';
import type { AppConfig } from '../config/app-config.js';
import { LiveGateway } from './live.gateway.js';

class FakeSocket {
  readyState = 1;
  frames: Array<{ type: string }> = [];
  send(frame: string) {
    this.frames.push(JSON.parse(frame));
  }
  on() {}
  types() {
    return this.frames.map((frame) => frame.type);
  }
}

function setup() {
  const auth = { isValidCookieHeader: (header?: string) => header === 'vigil_session=valid' };
  const config = { appOrigin: 'https://status.example.com' };
  const gateway = new LiveGateway(auth as unknown as AuthService, config as unknown as AppConfig);
  const clients = new Set<FakeSocket>();
  Object.assign(gateway, { server: { clients } });

  const connect = (headers: IncomingMessage['headers']) => {
    const socket = new FakeSocket();
    clients.add(socket);
    gateway.handleConnection(socket as unknown as WebSocket, { headers } as IncomingMessage);
    return socket;
  };
  return { gateway, connect };
}

describe('LiveGateway', () => {
  it('sends admin events only to sockets with a valid session', () => {
    const { gateway, connect } = setup();
    const visitor = connect({});
    const admin = connect({ cookie: 'vigil_session=valid', origin: 'https://status.example.com' });

    gateway.handleMonitorRemoved({ id: 'm1' });

    expect(admin.types()).toEqual(['monitor:removed', 'status:invalidated']);
    expect(visitor.types()).toEqual(['status:invalidated']);
  });

  it('ignores the session cookie on a handshake from another site', () => {
    const { gateway, connect } = setup();
    const hijacker = connect({ cookie: 'vigil_session=valid', origin: 'https://evil.example' });

    gateway.handleMonitorRemoved({ id: 'm1' });

    expect(hijacker.types()).toEqual(['status:invalidated']);
  });

  it('skips sockets that are not open', () => {
    const { gateway, connect } = setup();
    const closing = connect({});
    closing.readyState = 2;
    gateway.handleMonitorRemoved({ id: 'm1' });
    expect(closing.frames).toHaveLength(0);
  });
});
