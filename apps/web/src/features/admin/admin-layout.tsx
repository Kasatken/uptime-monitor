import { useQuery } from '@tanstack/react-query';
import { Activity, ExternalLink, LoaderCircle, LogOut, Siren } from 'lucide-react';
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

export function AdminLayout() {
  const session = useQuery(sessionQuery);
  const location = useLocation();

  if (session.isPending) return <FullPageSpinner />;
  if (!session.data) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <AdminShell />;
}

const NAV = [
  { to: '/admin', label: 'Мониторы', Icon: Activity },
  { to: '/admin/incidents', label: 'Инциденты', Icon: Siren },
] as const;

// "/admin/monitors/:id" belongs to the monitors tab, so NavLink matching alone is not enough
const isSectionActive = (to: string, pathname: string) =>
  to === '/admin/incidents' ? pathname.startsWith(to) : !pathname.startsWith('/admin/incidents');

function AdminShell() {
  const logout = useLogout();
  const { pathname } = useLocation();
  const { data: monitors } = useQuery(overviewQuery);
  const downCount = monitors?.filter((m) => m.status === 'down').length ?? 0;

  useAdminLiveSync();
  useAttentionSignals(monitors);

  const badge = (to: string) =>
    to === '/admin/incidents' && downCount > 0 ? (
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1.5 text-[11px] font-bold text-on-color tabular">
        {downCount}
      </span>
    ) : null;

  return (
    <div className="min-h-dvh pb-28 md:pb-0">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-4 pt-5 pb-2">
        <NavLink to="/admin" aria-label="Vigil — на главную">
          <Logo />
        </NavLink>

        <nav
          aria-label="Разделы"
          className="ml-4 hidden items-center gap-1 rounded-full bg-surface p-1 shadow-card md:flex"
        >
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition',
                isSectionActive(to, pathname)
                  ? 'bg-ink text-ink-fg'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {label}
              {badge(to)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LiveIndicator />
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap shadow-card hover:bg-surface-muted lg:inline-flex"
          >
            Страница статуса <ExternalLink className="size-3.5" />
          </a>
          <ThemeToggle />
          <Button
            variant="secondary"
            size="iconSm"
            aria-label="Выйти"
            title="Выйти"
            onClick={() => logout.mutate()}
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <nav
        aria-label="Разделы"
        className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-full bg-night p-2 shadow-2xl md:hidden"
      >
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold transition',
              isSectionActive(to, pathname) ? 'bg-lime text-on-color' : 'text-white/60',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
            {badge(to)}
          </NavLink>
        ))}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          aria-label="Страница статуса"
          className="grid size-12 place-items-center rounded-full text-white/60"
        >
          <ExternalLink className="size-5" />
        </a>
      </nav>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Загрузка">
      <LoaderCircle className="size-7 animate-spin text-fg-subtle" />
    </div>
  );
}
