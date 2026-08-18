'use client';

import type { CreateSpaceInput } from '@scalar/sdk';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function useSpaces() {
  return useQuery({
    queryKey: queryKeys.spaces,
    queryFn: () => scalar.spaces.list({ limit: 200 }),
  });
}

export function useCreateSpace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpaceInput) => scalar.spaces.create(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.spaces });
    },
  });
}
