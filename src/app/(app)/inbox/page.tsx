import { EmptyState } from '@scalar/ui';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Inbox' };

export default function InboxPage() {
  return (
    <>
      <PageHeader title="Inbox" description="Actionable items from your connected services." />
      <EmptyState
        title="Inbox zero."
        description="Scalar will surface email, assignments, and updates that need your attention once integrations are connected. Integrations are not available yet."
      />
    </>
  );
}
