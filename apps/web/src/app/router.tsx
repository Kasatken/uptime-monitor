import type { ReactNode } from 'react';
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
      <Toaster
        theme={theme}
        position="top-center"
        richColors
        closeButton
        toastOptions={{ className: '!rounded-2xl !font-sans' }}
      />
    </>
  );
}

function CenteredMessage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-card bg-surface p-8 text-center shadow-card">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-fg-muted">{text}</p>
        <div className="mt-6">{action}</div>
      </div>
    </div>
  );
}

function RouteError() {
  const error = useRouteError();
  // After a deploy the old JS chunks are gone, a reload fetches the new ones
  const isStaleBundle =
    error instanceof TypeError &&
    /dynamically imported module|Failed to fetch/i.test(error.message);

  return (
    <CenteredMessage
      title={isStaleBundle ? 'Вышла новая версия' : 'Что-то пошло не так'}
      text={
        isStaleBundle
          ? 'Обновите страницу, чтобы загрузить её.'
          : 'Страница сломалась. Обычно помогает перезагрузка, а мониторы продолжают работать.'
      }
      action={
        <Button variant="primary" onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      }
    />
  );
}

function NotFound() {
  return (
    <CenteredMessage
      title="Страница не найдена"
      text="Возможно, ссылка устарела."
      action={
        <Link to="/" className="font-semibold text-fg-muted hover:text-fg">
          На страницу статуса
        </Link>
      }
    />
  );
}

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
