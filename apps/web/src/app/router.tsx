import { createBrowserRouter, Link, Outlet, useRouteError } from 'react-router';
import { Toaster } from 'sonner';
import { Button } from '../components/ui/button';
import { FullPageSpinner } from '../features/admin/admin-layout';
import { StatusPage } from '../features/status-page/status-page';
import { useTheme } from '../lib/theme';

function RootLayout() {
  const { theme } = useTheme();
  return (
    <>
      <Outlet />
      <Toaster theme={theme} position="bottom-right" richColors closeButton />
    </>
  );
}

function RouteError() {
  const error = useRouteError();
  // After a deploy the old JS chunks are gone – a reload fetches the new ones
  const isStaleBundle =
    error instanceof TypeError &&
    /dynamically imported module|Failed to fetch/i.test(error.message);

  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold">
          {isStaleBundle ? 'A new version is available' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {isStaleBundle
            ? 'Reload the page to get the latest version.'
            : 'The page crashed. Reloading usually helps; your monitors keep running either way.'}
        </p>
        {import.meta.env.DEV && error instanceof Error && !isStaleBundle && (
          <pre className="mt-4 overflow-auto rounded-lg bg-surface-muted p-3 text-left text-xs text-down">
            {error.message}
          </pre>
        )}
        <Button variant="primary" className="mt-6" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-medium text-fg-muted">404</p>
        <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-fg-muted hover:text-fg">
          Go to the status page
        </Link>
      </div>
    </div>
  );
}

/*
 * The public status page is in the main bundle so it loads instantly for visitors.
 * Everything admin (forms, charts, dialogs) is code-split and only fetched after login.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    HydrateFallback: FullPageSpinner,
    children: [
      { path: '/', element: <StatusPage /> },
      {
        path: '/login',
        lazy: async () => ({ Component: (await import('../features/auth/login-page')).LoginPage }),
      },
      {
        path: '/admin',
        lazy: async () => ({
          Component: (await import('../features/admin/admin-layout')).AdminLayout,
        }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../features/monitors/monitors-page')).MonitorsPage,
            }),
          },
          {
            path: 'monitors/:id',
            lazy: async () => ({
              Component: (await import('../features/monitors/monitor-detail-page'))
                .MonitorDetailPage,
            }),
          },
          {
            path: 'incidents',
            lazy: async () => ({
              Component: (await import('../features/incidents/incidents-page')).IncidentsPage,
            }),
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
