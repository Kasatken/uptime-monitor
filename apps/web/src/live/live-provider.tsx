import { useQueryClient } from '@tanstack/react-query';
import {
  type ClientToServerEvents,
  LIVE_NAMESPACE,
  type ServerToClientEvents,
} from '@vigil/shared';
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';

export type LiveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnectionState = 'connecting' | 'live' | 'offline';

interface LiveContextValue {
  socket: LiveSocket;
  state: ConnectionState;
  /** Re-handshake, e.g. after login, so the server puts us into the admin room. */
  reconnect: () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [socket] = useState<LiveSocket>(() =>
    io(LIVE_NAMESPACE, { transports: ['websocket'], withCredentials: true }),
  );
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    let wasConnected = false;

    const onConnect = () => {
      setState('live');
      // Events sent while we were offline are lost – catch up with one refetch
      if (wasConnected) void queryClient.invalidateQueries();
      wasConnected = true;
    };
    const onDisconnect = () => setState('offline');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', () => setState('connecting'));
    socket.io.on('reconnect_failed', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_failed');
    };
  }, [socket, queryClient]);

  const value = useMemo<LiveContextValue>(
    () => ({
      socket,
      state,
      reconnect: () => {
        socket.disconnect();
        socket.connect();
      },
    }),
    [socket, state],
  );

  return <LiveContext value={value}>{children}</LiveContext>;
}

export function useLive(): LiveContextValue {
  const context = use(LiveContext);
  if (!context) throw new Error('useLive must be used inside <LiveProvider>');
  return context;
}

/** Subscribe to a typed server event. The handler always sees fresh props/state. */
export function useLiveEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
) {
  const { socket } = useLive();
  const onEvent = useEffectEvent((...args: Parameters<ServerToClientEvents[E]>) => {
    (handler as (...a: typeof args) => void)(...args);
  });

  useEffect(() => {
    const listener = (...args: Parameters<ServerToClientEvents[E]>) => onEvent(...args);
    // socket.io's overloads can't follow the generic E – the public signature above is typed
    const untyped = socket as unknown as Socket;
    untyped.on(event as string, listener);
    return () => {
      untyped.off(event as string, listener);
    };
  }, [socket, event]);
}
