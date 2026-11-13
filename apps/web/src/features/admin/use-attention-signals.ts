import type { MonitorSummaryDto } from '@vigil/shared';
import { useEffect } from 'react';

const ICON_OK = '/favicon.svg';

const alertIcon = (count: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0f172a"/><path d="M6 17h5l3-8 4 14 3-6h5" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="8" fill="#ef4444"/><text x="24" y="12" font-size="11" font-family="system-ui" font-weight="700" fill="#fff" text-anchor="middle">${count > 9 ? '!' : count}</text></svg>`,
  )}`;

/**
 * When something is down the tab says so – visible even when the dashboard
 * is a background tab: "(2) down · Vigil" plus a red badge on the favicon.
 */
export function useAttentionSignals(monitors: MonitorSummaryDto[] | undefined) {
  const down = monitors?.filter((m) => m.status === 'down').length ?? 0;

  useEffect(() => {
    document.title = down > 0 ? `(${down}) down · Vigil` : 'Vigil';
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = down > 0 ? alertIcon(down) : ICON_OK;
  }, [down]);

  useEffect(
    () => () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = ICON_OK;
    },
    [],
  );
}
