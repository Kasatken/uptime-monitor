import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'vigil:theme';

const read = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

// The initial theme is applied by public/theme.js before the first paint.
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read);

  const toggle = useCallback(() => {
    const next: Theme = read() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return { theme, toggle };
}
