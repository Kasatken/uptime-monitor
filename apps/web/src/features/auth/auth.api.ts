import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, isUnauthorized } from '../../lib/api-client';
import { useLive } from '../../live/live-provider';

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async () => {
    try {
      await api('/auth/session');
      return true;
    } catch (error) {
      if (isUnauthorized(error)) return false;
      throw error;
    }
  },
  staleTime: 5 * 60_000,
});

export function useLogin() {
  const queryClient = useQueryClient();
  const live = useLive();

  return useMutation({
    mutationFn: (password: string) => api('/auth/login', { method: 'POST', json: { password } }),
    onSuccess: () => {
      queryClient.setQueryData(sessionQuery.queryKey, true);
      // the socket was opened anonymously – reconnect so it joins the admin room
      live.reconnect();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const live = useLive();

  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(sessionQuery.queryKey, false);
      live.reconnect();
    },
  });
}
