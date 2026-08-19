'use client';

import { useQuery } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';
import { localTimeZone } from '../time';

export function useTimeline(date?: string) {
  const tz = localTimeZone();
  return useQuery({
    queryKey: queryKeys.timeline(tz, date),
    queryFn: () => scalar.timeline.get({ tz, ...(date ? { date } : {}) }),
    refetchInterval: 5 * 60_000,
  });
}

/** A week, in one request. Used by the calendar view. */
export function useTimelineRange(from: string, to: string) {
  const tz = localTimeZone();
  return useQuery({
    queryKey: queryKeys.timelineRange(tz, from, to),
    queryFn: () => scalar.timeline.range({ from, to, tz }),
  });
}
