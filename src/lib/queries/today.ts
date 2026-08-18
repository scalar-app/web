'use client';

import { useQuery } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';
import { localTimeZone } from '../time';

export function useToday(date?: string) {
  const tz = localTimeZone();
  return useQuery({
    queryKey: queryKeys.today(tz, date),
    queryFn: () => scalar.today.get({ tz, ...(date ? { date } : {}) }),
    refetchInterval: 5 * 60_000,
  });
}
