'use client';

import type { DisconnectData, GoogleProvider } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

/** Poll while a sync is in flight so status and counts settle without a manual refresh. */
const ACTIVE_STATUSES = new Set(['queued', 'running']);

export function useIntegrations() {
  return useQuery({
    queryKey: queryKeys.integrations,
    queryFn: () => scalar.integrations.list(),
    refetchInterval: (query) => {
      const accounts = query.state.data;
      if (!accounts) return false;
      const busy = accounts.some((a) => a.resources.some((r) => ACTIVE_STATUSES.has(r.syncStatus)));
      return busy ? 3000 : false;
    },
  });
}

export function useConnectCanvas() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { baseUrl: string; accessToken: string }) =>
      scalar.integrations.connectCanvas(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.integrations });
      // A first Canvas sync fills the inbox, so it should not look empty afterwards.
      void client.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useConnectGoogle() {
  return useMutation({
    mutationFn: (provider: GoogleProvider = 'google_calendar') =>
      scalar.integrations.connectGoogle(provider),
    onSuccess: ({ url }) => {
      // Full navigation, not a router push: the consent screen is on Google's origin.
      window.location.assign(url);
    },
  });
}

export function useSyncIntegration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scalar.integrations.sync(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });
}

export function useDisconnectIntegration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DisconnectData }) =>
      scalar.integrations.disconnect(id, { data }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.integrations });
      void client.invalidateQueries({ queryKey: ['events'] });
      void client.invalidateQueries({ queryKey: ['today'] });
    },
  });
}
