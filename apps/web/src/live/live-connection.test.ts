import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveConnection, type SocketLike } from './live-connection';

class FakeSocket implements SocketLike {
  onopen: SocketLike['onopen'] = null;
  onclose: SocketLike['onclose'] = null;
  onmessage: SocketLike['onmessage'] = null;
  closed = false;

  close() {
    this.closed = true;
    this.fire('onclose');
  }
  open() {
    this.fire('onopen');
  }
  drop() {
    this.fire('onclose');
  }
  serverSends(message: unknown) {
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    this.onmessage?.call(this as never, { data } as MessageEvent);
  }
  private fire(handler: 'onopen' | 'onclose') {
    this[handler]?.call(this as never, {} as never);
  }
}

function setup() {
  const sockets: FakeSocket[] = [];
  const connection = new LiveConnection({
    url: 'ws://test/api/live',
    minDelayMs: 1000,
    maxDelayMs: 8000,
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  });
  const latest = () => sockets.at(-1) as FakeSocket;
  return { connection, sockets, latest };
}

describe('LiveConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(1);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('delivers typed messages to listeners of that type only', () => {
    const { connection, latest } = setup();
    const onRemoved = vi.fn();
    const onSaved = vi.fn();
    connection.on('monitor:removed', onRemoved);
    connection.on('monitor:saved', onSaved);
    connection.connect();

    latest().serverSends({ type: 'monitor:removed', data: { id: 'm1' } });
    latest().serverSends('not json');

    expect(onRemoved).toHaveBeenCalledWith({ id: 'm1' });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('reports its state', () => {
    const { connection, latest } = setup();
    const states: string[] = [];
    connection.onStateChange((state) => states.push(state));
    connection.connect();
    latest().open();
    latest().drop();
    expect(states).toEqual(['live', 'offline']);
  });

  it('reconnects with growing delays and resets them after success', () => {
    const { connection, sockets, latest } = setup();
    connection.connect();

    latest().drop();
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    latest().drop();
    vi.advanceTimersByTime(2000);
    expect(sockets).toHaveLength(3);

    latest().open();
    latest().drop();
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(4);
  });

  it('never waits longer than the maximum delay', () => {
    const { connection, sockets, latest } = setup();
    connection.connect();
    for (let i = 0; i < 6; i++) {
      latest().drop();
      vi.advanceTimersByTime(8000);
    }
    expect(sockets).toHaveLength(7);
  });

  it('stops reconnecting after close()', () => {
    const { connection, sockets } = setup();
    connection.connect();
    connection.close();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
    expect(sockets[0]?.closed).toBe(true);
  });

  it('reconnect() opens a new socket immediately without scheduling an extra one', () => {
    const { connection, sockets } = setup();
    connection.connect();
    connection.reconnect();
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(2);
  });
});
