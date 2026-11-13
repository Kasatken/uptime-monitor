import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError, isUnauthorized } from './api-client';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Session expired somewhere in the app → let the auth gate re-check and redirect
    onError: (error) => {
      if (isUnauthorized(error)) void queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
