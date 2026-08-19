'use client';

import type { UpdatePreferencesInput } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => scalar.preferences.get(),
  });
}

export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePreferencesInput) => scalar.preferences.update(input),
    onSuccess: (saved) => {
      // The server merged and validated; use what it returned rather than guessing.
      client.setQueryData(queryKeys.preferences, saved);
    },
  });
}
