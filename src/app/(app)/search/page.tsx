import { EmptyState } from '@scalar/ui';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <>
      <PageHeader
        title="Search"
        description="Across tasks, events, spaces and connected services."
      />
      <EmptyState
        title="Search is on its way."
        description="For now, Command (⌘K) jumps between pages and creates tasks. Full search across everything arrives with the search service."
      />
    </>
  );
}
