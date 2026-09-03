import type { Metadata } from 'next';
import { WorkspaceMembersView } from './WorkspaceMembersView';

export const metadata: Metadata = { title: 'Workspace' };

export default function WorkspacePage() {
  return <WorkspaceMembersView />;
}
