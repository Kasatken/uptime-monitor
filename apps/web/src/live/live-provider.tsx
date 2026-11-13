import { useQueryClient } from '@tanstack/react-query';
import { LIVE_PATH, type LiveEvents, type LiveEventType } from '@vigil/shared';
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { type ConnectionState, LiveConnection } from './live-connection';

export type { ConnectionState };

interface LiveContextValue {
  connection: LiveConnection;
  state: ConnectionState;
}

const LiveContext = createContext<LiveContextValue | null>(null);

const liveUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${LIVE_PATH}`;
};

export function LiveProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [connection] = useState(() => new LiveConnection({ url: liveUrl() }));
  const state = useSyncExternalStore(
    (notify) => connection.onStateChange(notify),
    () => connection.state,
  );

  useEffect(() => {
    let wasLive = false;
    const unsubscribe = connection.onStateChange((next) => {
      if (next !== 'live') return;
      // Events sent while we were offline are lost – catch up with one refetch
      if (wasLive) void queryClient.invalidateQueries();
      wasLive = true;
    });
    const onOnline = () => connection.retryNow();

    window.addEventListener('online', onOnline);
    connection.connect();
    return () => {
      unsubscribe();
      window.removeEventListener('online', onOnline);
      connection.close();
    };
  }, [connection, queryClient]);

  const value = useMemo(() => ({ connection, state }), [connection, state]);
  return <LiveContext value={value}>{children}</LiveContext>;
}

export function useLive(): LiveContextValue & { reconnect: () => void } {
  const context = use(LiveContext);
  if (!context) throw new Error('useLive must be used inside <LiveProvider>');
  return { ...context, reconnect: () => context.connection.reconnect() };
}

export function useLiveEvent<K extends LiveEventType>(
  type: K,
  handler: (data: LiveEvents[K]) => void,
) {
  const { connection } = useLive();
  const onEvent = useEffectEvent(handler);
  useEffect(() => connection.on(type, (data) => onEvent(data)), [connection, type]);
}
