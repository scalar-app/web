'use client';

import type { Invitation, WorkspaceMember, WorkspaceRole } from '@scalar/sdk';
import { Badge, Button, EmptyState, Input, Panel, Select, Spinner } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { useSessionContext } from '@/lib/queries/auth';
import {
  useDeleteWorkspace,
  useInvitations,
  useInvite,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useTransferOwnership,
  useUpdateMemberRole,
} from '@/lib/queries/workspaces';

/**
 * Who is in this workspace.
 *
 * The rules are the API's and are enforced there; this screen's job is to make them visible, so
 * that a control somebody cannot use is not shown at all rather than shown and then refused.
 *
 * Roles read as sentences rather than as words, because "admin" tells somebody granting it very
 * little about what they are granting.
 */

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

const ROLE_DETAIL: Record<WorkspaceRole, string> = {
  owner: 'Runs this workspace. Can change roles, and cannot be removed.',
  admin: 'Can invite people and remove members.',
  member: 'Can use everything in the workspace.',
};

function MemberRow({
  member,
  workspaceId,
  isSelf,
  viewerRole,
}: {
  member: WorkspaceMember;
  workspaceId: string;
  isSelf: boolean;
  viewerRole: WorkspaceRole;
}) {
  const updateRole = useUpdateMemberRole(workspaceId);
  const remove = useRemoveMember(workspaceId);
  const transfer = useTransferOwnership(workspaceId);
  const [handingOver, setHandingOver] = useState(false);

  // The owner is fixed, and only the owner may change anybody's role.
  const mayChangeRole = viewerRole === 'owner' && member.role !== 'owner';
  // Leaving is always allowed except for the owner; removing needs admin, and an admin may not
  // remove another admin.
  const mayRemove =
    member.role !== 'owner' &&
    (isSelf ||
      (viewerRole === 'owner' ? true : viewerRole === 'admin' && member.role === 'member'));

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-primary">{member.name ?? member.email}</p>
        {member.name ? <p className="truncate text-[12px] text-muted">{member.email}</p> : null}
      </div>

      {mayChangeRole ? (
        <Select
          aria-label={`Role for ${member.email}`}
          value={member.role}
          onChange={(event) => {
            const role = event.target.value;
            if (role === 'admin' || role === 'member') {
              updateRole.mutate({ userId: member.userId, role });
            }
          }}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
      ) : (
        <Badge tone={member.role === 'owner' ? 'success' : 'neutral'}>
          {ROLE_LABEL[member.role]}
        </Badge>
      )}

      {/*
        Handing the workspace over is the only way an owner can ever leave, so it lives next to the
        person receiving it rather than in a settings page of its own. Two steps, because it cannot
        be undone without the other person's help.
      */}
      {viewerRole === 'owner' && !isSelf && member.role !== 'owner' ? (
        handingOver ? (
          <Button
            size="sm"
            variant="secondary"
            loading={transfer.isPending}
            onClick={() =>
              transfer.mutate(member.userId, { onSuccess: () => setHandingOver(false) })
            }
          >
            Yes, hand it to {member.email}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setHandingOver(true)}>
            Make owner
          </Button>
        )
      ) : null}

      {mayRemove ? (
        <Button
          size="sm"
          variant="ghost"
          loading={remove.isPending}
          onClick={() => remove.mutate({ userId: member.userId, leaving: isSelf })}
        >
          {isSelf ? 'Leave' : 'Remove'}
        </Button>
      ) : null}
    </li>
  );
}

/**
 * Shutting a workspace down.
 *
 * Everything in it goes, for everybody, and there is no undo. The name has to be typed, which the
 * API checks as well: a confirmation only the browser enforces is one a stale tab skips. It is the
 * last thing on the page and it is not styled to be attractive.
 */
function DangerZone({ workspaceId, name }: { workspaceId: string; name: string }) {
  const remove = useDeleteWorkspace(workspaceId);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const router = useRouter();

  return (
    <Panel title="Delete this workspace">
      <p className="text-[13px] text-secondary">
        Every task, event, project and conversation in {name} is deleted, for everybody in it. This
        cannot be undone. Your own workspace is not touched.
      </p>
      {open ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            remove.mutate(typed, { onSuccess: () => router.replace('/today') });
          }}
        >
          <label className="min-w-[16rem] flex-1 text-[12px] text-secondary">
            Type {name} to confirm
            <Input
              className="mt-1"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              aria-label={`Type ${name} to confirm`}
            />
          </label>
          <Button type="submit" size="sm" variant="danger" loading={remove.isPending}>
            Delete workspace
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <div className="mt-4">
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Delete workspace
          </Button>
        </div>
      )}
      {remove.isError ? (
        <div className="mt-4">
          <ErrorNotice
            title="Nothing was deleted."
            description={(remove.error as { message?: string } | null)?.message ?? null}
          />
        </div>
      ) : null}
    </Panel>
  );
}

export function WorkspaceMembersView() {
  const context = useSessionContext();
  const workspace = context.data?.workspace ?? null;
  const workspaceId = workspace?.id ?? null;
  const viewerRole = workspace?.role ?? 'member';
  const canInvite = viewerRole === 'owner' || viewerRole === 'admin';

  const members = useMembers(workspaceId);
  const invitations = useInvitations(workspaceId, canInvite);
  const invite = useInvite(workspaceId);
  const revoke = useRevokeInvitation(workspaceId);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [sent, setSent] = useState<Invitation | null>(null);

  if (workspace?.kind === 'personal') {
    return (
      <>
        <PageHeader title="Workspace" />
        <Panel title={workspace.name}>
          <p className="text-[13px] text-secondary">
            This is your own workspace, and it cannot be shared. It holds the things you never chose
            to show anybody, so sharing happens in a workspace made for it: create one from the
            switcher at the top of the sidebar, and invite people to that.
          </p>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title={workspace?.name ?? 'Workspace'} />

      <Panel title="People">
        {members.isPending ? (
          <div className="py-6 text-center" aria-busy="true">
            <Spinner size={14} />
          </div>
        ) : members.isError ? (
          <ErrorNotice
            title="The member list could not be loaded."
            onRetry={() => void members.refetch()}
          />
        ) : (
          <ul className="flex flex-col">
            {members.data.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                workspaceId={workspaceId ?? ''}
                isSelf={member.userId === context.data?.user.id}
                viewerRole={viewerRole}
              />
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-muted">{ROLE_DETAIL[viewerRole]}</p>
      </Panel>

      {canInvite ? (
        <div className="mt-6">
          <Panel title="Invite somebody">
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = email.trim();
                if (!trimmed) return;
                invite.mutate(
                  { email: trimmed, role },
                  {
                    onSuccess: (invitation) => {
                      setSent(invitation);
                      setEmail('');
                    },
                  },
                );
              }}
            >
              <label className="min-w-[16rem] flex-1 text-[12px] text-secondary">
                Email address
                <Input
                  className="mt-1"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="them@example.com"
                />
              </label>
              <label className="text-[12px] text-secondary">
                Role
                <Select
                  className="mt-1"
                  value={role}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === 'admin' || next === 'member') setRole(next);
                  }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
              </label>
              <Button type="submit" size="sm" loading={invite.isPending}>
                Send invitation
              </Button>
            </form>

            <p className="mt-3 text-[12px] text-muted">
              They will be able to see and change everything in this workspace. Nothing in your own
              workspace is shared by this.
            </p>

            {invite.isError ? (
              <div className="mt-4">
                <ErrorNotice
                  title="That invitation could not be sent."
                  description={
                    (invite.error as { message?: string } | null)?.message ?? 'Try again.'
                  }
                />
              </div>
            ) : null}

            {/*
              No mail server, so the link comes back here for the person inviting to pass on. This
              is the self-hosted case rather than a development fallback, and saying nothing would
              leave an invitation that never arrives.
            */}
            {sent?.link ? (
              <div className="mt-4 rounded-md border border-border p-3">
                <p className="text-[13px] text-primary">
                  This server cannot send email, so send them this link yourself:
                </p>
                <code className="mt-2 block break-all rounded bg-surface p-2 font-mono text-[12px] text-secondary">
                  {sent.link}
                </code>
                <p className="mt-2 text-[12px] text-muted">
                  It works once, expires in seven days, and only for {sent.email}.
                </p>
              </div>
            ) : null}
            {sent && !sent.link ? (
              <p className="mt-4 text-[13px] text-secondary">Invitation sent to {sent.email}.</p>
            ) : null}
          </Panel>
        </div>
      ) : null}

      {canInvite ? (
        <div className="mt-6">
          <Panel title="Waiting to accept">
            {invitations.isPending ? (
              <div className="py-4 text-center" aria-busy="true">
                <Spinner size={14} />
              </div>
            ) : invitations.isError ? (
              <ErrorNotice title="Open invitations could not be loaded." />
            ) : invitations.data.length === 0 ? (
              <EmptyState
                title="Nobody is waiting."
                description="Invitations you send appear here until they are accepted."
              />
            ) : (
              <ul className="flex flex-col">
                {invitations.data.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] text-primary">
                      {invitation.email}
                    </span>
                    <Badge tone="neutral">{ROLE_LABEL[invitation.role]}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={revoke.isPending}
                      onClick={() => revoke.mutate(invitation.id)}
                    >
                      Withdraw
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {viewerRole === 'owner' && workspaceId ? (
        <div className="mt-6">
          <DangerZone workspaceId={workspaceId} name={workspace?.name ?? ''} />
        </div>
      ) : null}
    </>
  );
}
