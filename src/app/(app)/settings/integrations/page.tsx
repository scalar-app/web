import type { Metadata } from 'next';
import { Suspense } from 'react';
import { IntegrationsView } from './IntegrationsView';

export const metadata: Metadata = { title: 'Integrations' };

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsView />
    </Suspense>
  );
}
