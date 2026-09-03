import type { Metadata } from 'next';
import { AcceptInvitationView } from './AcceptInvitationView';

export const metadata: Metadata = { title: 'Invitation' };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInvitationView token={token} />;
}
