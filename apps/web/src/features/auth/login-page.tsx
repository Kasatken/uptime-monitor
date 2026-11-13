import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '../../components/logo';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Field, Input } from '../../components/ui/field';
import { sessionQuery, useLogin } from './auth.api';

/** Only allow redirects inside the app, never to another origin. */
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
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="text-lg" />
        </div>
        <Card className="p-6">
          <h1 className="text-base font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Enter the admin password from your server config.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field label="Password" error={login.error?.message}>
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
              Continue <ArrowRight />
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-fg-muted hover:text-fg">
            ← Public status page
          </Link>
        </p>
      </div>
    </div>
  );
}
