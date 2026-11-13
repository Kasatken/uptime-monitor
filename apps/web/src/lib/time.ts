import { useSyncExternalStore } from 'react';

// One shared 1-second ticker for every "12 с назад" label instead of an interval per component.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    for (const notify of listeners) notify();
  }, 1000);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export const useNow = () => useSyncExternalStore(subscribe, () => now);

export function timeAgo(iso: string | null, nowMs: number): string {
  if (!iso) return 'ещё не было';
  const seconds = Math.round((nowMs - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return 'только что';
  if (seconds < 60) return `${seconds} с назад`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} ч назад`;
  return `${Math.floor(seconds / 86_400)} дн. назад`;
}

const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const time = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const shortTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatTime = (iso: string) => time.format(new Date(iso));
export const formatShortTime = (iso: string) => shortTime.format(new Date(iso));
export const formatDay = (isoDay: string) => day.format(new Date(`${isoDay}T00:00:00Z`));
