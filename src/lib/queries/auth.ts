'use client';

import { isScalarApiError, type User } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /**
   * The server did not answer, or answered with a fault. Not the same as being signed out.
   * `offline` means the browser never sent the request, so the server may be perfectly fine.
   */
  | { status: 'unreachable'; reason: 'offline' | 'error'; retry: () => void }
  | { status: 'signed-in'; user: User };

/** Source of truth for "am I signed in": the API answers, the UI never guesses from cookies. */
export function useSession(): SessionState {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => scalar.me.get(),
    // A 401 is a real answer and retrying it only delays the sign in screen. A dropped connection
    // or a 500 is not an answer, so those get a couple of goes before we tell anyone about it.
    retry: (count, error) => {
      if (isScalarApiError(error) && error.status < 500) return false;
      return count < 2;
    },
    staleTime: 60_000,
  });
  const retry = () => void query.refetch();
  if (query.isPending) {
    // A paused fetch is React Query holding the request back because it believes there is no
    // network. It keeps the query in `pending` while it waits, with nothing running and nothing
    // due to happen, so treating that as "loading" is a spinner that spins until the connection
    // comes back. Say so instead.
    if (query.fetchStatus === 'paused') {
      return { status: 'unreachable', reason: 'offline', retry };
    }
    return { status: 'loading' };
  }
  if (query.data) return { status: 'signed-in', user: query.data };
  if (isScalarApiError(query.error) && query.error.status === 401) return { status: 'signed-out' };
  // Anything else means we do not know. Reporting it as signed out would throw the person back to
  // the sign in screen because their server had a bad minute, and signing in again would not work
  // either, so the screen would be a lie as well as a nuisance.
  return { status: 'unreachable', reason: 'error', retry };
}

/**
 * The user *and* the workspace this session is looking at.
 *
 * `useSession` narrows to the user, which is what most of the app wants. Anything that has to name
 * the workspace -- the switcher, the members page -- needs this instead, and it shares the cache
 * key with `/me` because it is the same request.
 */
export function useSessionContext() {
  return useQuery({
    queryKey: queryKeys.meContext,
    queryFn: () => scalar.me.context(),
    staleTime: 60_000,
  });
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
