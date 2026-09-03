'use client';

import { isScalarApiError } from '@scalar/sdk';
import { Button, Panel, Spinner } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { useSessionContext } from '@/lib/queries/auth';
import { useAcceptInvitation, useInvitationPreview } from '@/lib/queries/workspaces';

/**
 * Deciding whether to join a workspace.
 *
 * The page says which workspace, who asked, and what joining means, and then asks. It does not
 * accept on arrival: opening a link is not agreement, and an invitation that joined you the moment
 * you clicked it would make a forwarded link into a trap.
 *
 * The wrong-account case is the one worth handling well. An invitation belongs to an address, and
 * somebody signed in as a different one needs to be told which address to use rather than shown a
 * refusal they cannot act on.
 */
export function AcceptInvitationView({ token }: { token: string }) {
  const preview = useInvitationPreview(token);
  const context = useSessionContext();
  const accept = useAcceptInvitation();
  const router = useRouter();

  if (preview.isPending || context.isPending) {
    return (
      <div className="py-10 text-center" aria-busy="true">
        <Spinner size={16} />
      </div>
    );
  }

  if (preview.isError) {
    const gone = isScalarApiError(preview.error) && preview.error.status === 404;
    return (
      <>
        <PageHeader title="Invitation" />
        <ErrorNotice
          title={
            gone
              ? 'That invitation has expired or has already been used.'
              : 'That invitation could not be opened.'
          }
          description={
            gone ? 'Ask whoever invited you to send another one.' : 'Try again in a moment.'
          }
        />
      </>
    );
  }

  const invitation = preview.data;
  const signedInAs = context.data?.user.email ?? '';
  const wrongAccount = signedInAs.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <>
      <PageHeader title="Invitation" />
      <Panel title={invitation.workspaceName}>
        <p className="text-[13px] text-secondary">
          {invitation.invitedByEmail} invited you to join{' '}
          <span className="text-primary">{invitation.workspaceName}</span> as{' '}
          {invitation.role === 'admin' ? 'an admin' : 'a member'}.
        </p>
        <p className="mt-2 text-[13px] text-secondary">
          Joining lets you see and change everything in that workspace. It does not give anybody
          access to your own workspace, and you can leave at any time.
        </p>

        {wrongAccount ? (
          <div className="mt-4 rounded-md border border-border p-3">
            <p className="text-[13px] text-primary">
              This invitation was sent to {invitation.email}.
            </p>
            <p className="mt-1 text-[12px] text-secondary">
              You are signed in as {signedInAs}. Sign in as {invitation.email} to accept it.
            </p>
          </div>
        ) : null}

        {accept.isError ? (
          <div className="mt-4">
            <ErrorNotice
              title="That invitation could not be accepted."
              description={(accept.error as { message?: string } | null)?.message ?? null}
            />
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <Button
            size="sm"
            disabled={wrongAccount}
            loading={accept.isPending}
            onClick={() =>
              accept.mutate(token, {
                onSuccess: () => router.replace('/today'),
              })
            }
          >
            Join {invitation.workspaceName}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.replace('/today')}>
            Not now
          </Button>
        </div>
      </Panel>
    </>
  );
}
