import { useQuery } from '@tanstack/react-query';
import { ExternalLink, LoaderCircle, LogOut } from 'lucide-react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { LiveIndicator } from '../../components/live-indicator';
import { Logo } from '../../components/logo';
import { ThemeToggle } from '../../components/theme-toggle';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { sessionQuery, useLogout } from '../auth/auth.api';
import { overviewQuery } from '../monitors/monitors.api';
import { useAdminLiveSync } from './use-admin-live-sync';
import { useAttentionSignals } from './use-attention-signals';

/** Auth gate for everything under /admin. */
export function AdminLayout() {
  const session = useQuery(sessionQuery);
  const location = useLocation();

  if (session.isPending) return <FullPageSpinner />;
  if (!session.data) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <AdminShell />;
}

function AdminShell() {
  const logout = useLogout();
  const { data: monitors } = useQuery(overviewQuery);
  const openIncidents = monitors?.filter((m) => m.status === 'down').length ?? 0;

  useAdminLiveSync();
  useAttentionSignals(monitors);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex h-14 items-center gap-1.5 text-sm font-medium transition-colors',
      isActive
        ? 'text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-fg'
        : 'text-fg-muted hover:text-fg',
    );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <NavLink to="/admin" aria-label="Vigil home">
            <Logo />
          </NavLink>
          <nav className="flex items-center gap-5" aria-label="Main">
            <NavLink to="/admin" end className={navClass}>
              Monitors
            </NavLink>
            <NavLink to="/admin/incidents" className={navClass}>
              Incidents
              {openIncidents > 0 && (
                <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-down px-1 text-[10px] font-semibold text-white tabular">
                  {openIncidents}
                </span>
              )}
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <LiveIndicator className="mr-1 max-sm:hidden" />
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg max-sm:hidden"
            >
              Status page <ExternalLink className="size-3.5" />
            </a>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => logout.mutate()}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
      <LoaderCircle className="size-6 animate-spin text-fg-subtle" />
    </div>
  );
}
