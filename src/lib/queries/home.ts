'use client';

import { useQuery } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';
import { localTimeZone } from '../time';

export function useHome(date?: string) {
  const tz = localTimeZone();
  return useQuery({
    queryKey: queryKeys.home(tz, date),
    queryFn: () => scalar.home.get({ tz, ...(date ? { date } : {}) }),
    refetchInterval: 5 * 60_000,
  });
}
