'use client';

import type { CompleteFocusInput, StartFocusInput } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function useCurrentFocus() {
  return useQuery({
    queryKey: queryKeys.focusCurrent,
    queryFn: () => scalar.focus.current(),
  });
}

export function useFocusHistory(taskId?: string) {
  return useQuery({
    queryKey: queryKeys.focusSessions(taskId),
    queryFn: () => scalar.focus.sessions({ limit: 20, ...(taskId ? { taskId } : {}) }),
  });
}

/** Everything that ends a session touches the same things, so they invalidate the same way. */
function useFocusInvalidation() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.focusCurrent });
    void client.invalidateQueries({ queryKey: ['focus', 'sessions'] });
    void client.invalidateQueries({ queryKey: ['tasks'] });
    void client.invalidateQueries({ queryKey: ['today'] });
    void client.invalidateQueries({ queryKey: ['timeline'] });
  };
}

export function useStartFocus() {
  const invalidate = useFocusInvalidation();
  return useMutation({
    mutationFn: (input: StartFocusInput) => scalar.focus.start(input),
    onSuccess: invalidate,
  });
}

export function useCompleteFocus() {
  const invalidate = useFocusInvalidation();
  return useMutation({
    mutationFn: (input: { id: string } & CompleteFocusInput) =>
      scalar.focus.complete(input.id, {
        notes: input.notes ?? null,
        ...(input.completeTask ? { completeTask: true } : {}),
      }),
    onSuccess: invalidate,
  });
}

export function useCancelFocus() {
  const invalidate = useFocusInvalidation();
  return useMutation({
    mutationFn: (id: string) => scalar.focus.cancel(id),
    onSuccess: invalidate,
  });
}
