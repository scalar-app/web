'use client';

import { useQuery } from '@tanstack/react-query';
import { scalar } from '../api';
import { queryKeys } from '../query-keys';

/** The server rejects anything shorter, and a single letter matches most of a workspace anyway. */
export const MIN_SEARCH_LENGTH = 2;

export function useSearch(term: string) {
  const trimmed = term.trim();
  const enabled = trimmed.length >= MIN_SEARCH_LENGTH;

  return useQuery({
    queryKey: queryKeys.search(trimmed),
    queryFn: () => scalar.search.query({ q: trimmed }),
    enabled,
    // A search result is worth reusing while somebody refines the same term, and worth
    // forgetting soon after, because the underlying rows change as they work.
    staleTime: 15_000,
  });
}
