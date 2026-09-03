'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

/**
 * The unread count is polled, because nothing pushes yet. A minute is slow enough that it costs
 * nothing on a self-hosted box and fast enough that a badge is not stale in any way a person would
 * notice; a sync runs every fifteen.
 */
const POLL_MS = 60_000;

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => scalar.notifications.list({ limit: 50 }),
    refetchInterval: POLL_MS,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scalar.notifications.markRead(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => scalar.notifications.markAllRead(),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
