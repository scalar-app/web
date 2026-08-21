import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyClient } from './VerifyClient';

export const metadata: Metadata = { title: 'Signing in' };

export default function VerifyPage() {
  return (
    <main className="min-h-app flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <VerifyClient />
      </Suspense>
    </main>
  );
}
