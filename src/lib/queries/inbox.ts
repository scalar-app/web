'use client';

import type { AcceptSuggestionInput, DismissSuggestionInput } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function useInbox() {
  return useQuery({
    queryKey: queryKeys.inbox,
    queryFn: () => scalar.inbox.list({ limit: 100 }),
  });
}

function useInboxInvalidation() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: queryKeys.inbox });
    void client.invalidateQueries({ queryKey: ['tasks'] });
    void client.invalidateQueries({ queryKey: ['home'] });
    void client.invalidateQueries({ queryKey: ['timeline'] });
  };
}

export function useAcceptSuggestion() {
  const invalidate = useInboxInvalidation();
  return useMutation({
    mutationFn: (input: { taskId: string } & AcceptSuggestionInput) =>
      scalar.inbox.accept(input.taskId, {
        values: input.values,
        ...(input.suggestionId ? { suggestionId: input.suggestionId } : {}),
      }),
    onSuccess: invalidate,
  });
}

export function useDismissSuggestion() {
  const invalidate = useInboxInvalidation();
  return useMutation({
    mutationFn: (input: { taskId: string } & DismissSuggestionInput) =>
      scalar.inbox.dismiss(
        input.taskId,
        input.suggestionId ? { suggestionId: input.suggestionId } : {},
      ),
    onSuccess: invalidate,
  });
}
