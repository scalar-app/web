'use client';

import { isScalarApiError, type User } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export type SessionState =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: User };

/** Source of truth for "am I signed in": the API answers, the UI never guesses from cookies. */
export function useSession(): SessionState {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => scalar.me.get(),
    retry: false,
    staleTime: 60_000,
  });
  if (query.isPending) return { status: 'loading' };
  if (query.data) return { status: 'signed-in', user: query.data };
  if (isScalarApiError(query.error) && query.error.status === 401) return { status: 'signed-out' };
  return { status: 'signed-out' };
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (email: string) => scalar.auth.requestMagicLink({ email }),
  });
}

/**
 * `onSuccess` is taken here rather than at `mutate()` call sites: mutation level callbacks always
 * fire, while call site callbacks are dropped if the observer resubscribes mid flight.
 */
export function useVerifyMagicLink(options: { onSuccess?: () => void } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => scalar.auth.verifyMagicLink(token),
    onSuccess: (data) => {
      client.setQueryData(queryKeys.me, data.user);
      options.onSuccess?.();
    },
  });
}

export function useLogout(options: { onSettled?: () => void } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => scalar.auth.logout(),
    onSettled: () => {
      client.clear();
      options.onSettled?.();
    },
  });
}
