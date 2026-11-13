import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '../../components/logo';
import { Button } from '../../components/ui/button';
import { Field, Input } from '../../components/ui/field';
import { sessionQuery, useLogin } from './auth.api';

// Only redirect inside the app, never to another origin ("//evil.com" is protocol-relative).
const safeRedirect = (value: string | null) =>
  value?.startsWith('/') && !value.startsWith('//') ? value : '/admin';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const session = useQuery(sessionQuery);
  const login = useLogin();
  const [password, setPassword] = useState('');
  const redirectTo = safeRedirect(params.get('next'));

  if (session.data === true) return <Navigate to={redirectTo} replace />;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(password, { onSuccess: () => navigate(redirectTo, { replace: true }) });
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-card bg-lime p-7 text-on-color">
          <Logo />
          <h1 className="mt-10 font-display text-3xl leading-tight font-semibold tracking-tight">
            С возвращением
          </h1>
          <p className="mt-2 text-sm opacity-70">Войдите, чтобы управлять мониторами.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-card bg-surface p-7 shadow-card">
          <Field
            label="Пароль"
            hint="Тот, что указан в ADMIN_PASSWORD на сервере"
            error={login.error?.message}
          >
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            loading={login.isPending}
          >
            Войти <ArrowRight />
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link to="/" className="font-medium text-fg-muted hover:text-fg">
            ← Публичная страница статуса
          </Link>
        </p>
      </div>
    </div>
  );
}
