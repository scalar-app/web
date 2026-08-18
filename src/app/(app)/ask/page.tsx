import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AskView } from './AskView';

export const metadata: Metadata = { title: 'Ask' };

/**
 * `?q=` carries a question handed over from the command palette. It is read in the client so this
 * route stays static, which is what lets the same build be packaged into the desktop and mobile
 * apps. `useSearchParams` needs a Suspense boundary above it.
 */
export default function AskPage() {
  return (
    <Suspense fallback={null}>
      <AskView />
    </Suspense>
  );
}
