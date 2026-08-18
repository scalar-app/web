'use client';

import type { CommandRequest } from '@scalar/sdk';
import { isScalarApiError } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

/** True when the server has no model configured, so Ask should say so rather than look broken. */
export function isAiUnavailable(error: unknown): boolean {
  return isScalarApiError(error) && error.code === 'AI_UNAVAILABLE';
}

export function useAsk() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CommandRequest) => scalar.command.ask(input),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: queryKeys.commandThreads });
      void client.invalidateQueries({ queryKey: queryKeys.commandThread(result.threadId) });
    },
  });
}

/**
 * Approving is the only call that changes anything, so it refreshes the task and calendar views
 * afterwards. A failed execution resolves rather than throws: the request worked, the outcome is
 * something to show on the card.
 */
export function useApproveAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scalar.command.approve(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['tasks'] });
      void client.invalidateQueries({ queryKey: ['today'] });
      void client.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useRejectAction() {
  return useMutation({ mutationFn: (id: string) => scalar.command.reject(id) });
}

export function useCommandThreads(enabled = true) {
  return useQuery({
    queryKey: queryKeys.commandThreads,
    queryFn: () => scalar.command.listThreads({ limit: 30 }),
    enabled,
    retry: (count, error) => !isAiUnavailable(error) && count < 2,
  });
}

export function useCommandThread(id: string | null) {
  return useQuery({
    queryKey: queryKeys.commandThread(id ?? 'none'),
    queryFn: () => scalar.command.getThread(id ?? ''),
    enabled: id !== null,
  });
}
