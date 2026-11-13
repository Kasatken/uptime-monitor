import type { LiveEvents, LiveEventType, LiveMessage } from '@vigil/shared';

export type ConnectionState = 'connecting' | 'live' | 'offline';

/** The part of the browser WebSocket we use, so tests can pass a fake. */
export type SocketLike = Pick<WebSocket, 'onopen' | 'onclose' | 'onmessage' | 'close'>;

interface Options {
  url: string;
  createSocket?: (url: string) => SocketLike;
  minDelayMs?: number;
  maxDelayMs?: number;
}

type Listener = (data: unknown) => void;

export class LiveConnection {
  state: ConnectionState = 'connecting';

  private socket: SocketLike | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;
  private stopped = true;
  private readonly listeners = new Map<LiveEventType, Set<Listener>>();
  private readonly stateListeners = new Set<(state: ConnectionState) => void>();

  private readonly url: string;
  private readonly createSocket: (url: string) => SocketLike;
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(options: Options) {
    this.url = options.url;
    this.createSocket = options.createSocket ?? ((url) => new WebSocket(url));
    this.minDelayMs = options.minDelayMs ?? 1_000;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
  }

  connect() {
    this.stopped = false;
    this.open();
  }

  close() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    this.dropSocket();
  }

  /** Fresh handshake right now, e.g. after login so the server sees the new session cookie. */
  reconnect() {
    if (this.stopped) return;
    this.attempt = 0;
    this.dropSocket();
    this.open();
  }

  /** Skip the backoff wait, e.g. when the browser reports that the network is back. */
  retryNow() {
    if (!this.stopped && this.state === 'offline') this.reconnect();
  }

  on<K extends LiveEventType>(type: K, listener: (data: LiveEvents[K]) => void): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as Listener);
    this.listeners.set(type, set);
    return () => set.delete(listener as Listener);
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private open() {
    clearTimeout(this.retryTimer);
    this.setState('connecting');

    const socket = this.createSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.setState('live');
    };
    socket.onmessage = (event) => this.dispatch(event.data);
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.setState('offline');
      if (!this.stopped) this.scheduleRetry();
    };
  }

  // Exponential backoff with jitter: after a server restart, open tabs don't all reconnect in the same millisecond.
  private scheduleRetry() {
    const ceiling = Math.min(this.maxDelayMs, this.minDelayMs * 2 ** this.attempt);
    const delay = ceiling / 2 + Math.random() * (ceiling / 2);
    this.attempt++;
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private dropSocket() {
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    socket.onclose = null;
    socket.onmessage = null;
    socket.close();
  }

  private dispatch(raw: unknown) {
    if (typeof raw !== 'string') return;
    let message: LiveMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    for (const listener of this.listeners.get(message.type) ?? []) listener(message.data);
  }

  private setState(state: ConnectionState) {
    if (this.state === state) return;
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }
}
