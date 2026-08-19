import type { Metadata } from 'next';
import { InboxView } from './InboxView';

export const metadata: Metadata = { title: 'Inbox' };

export default function InboxPage() {
  return <InboxView />;
}
