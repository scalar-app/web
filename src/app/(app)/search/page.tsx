import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchView } from './SearchView';

export const metadata: Metadata = { title: 'Search' };

/** `?q=` seeds the box, so a search can be linked to. Read in the client to keep this static. */
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
