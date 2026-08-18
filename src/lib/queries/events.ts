'use client';

import { useQuery } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

export function useEvents(from: Date, to: Date) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  return useQuery({
    queryKey: queryKeys.events(fromIso, toIso),
    queryFn: () => scalar.events.list({ from: fromIso, to: toIso, limit: 200 }),
  });
}
