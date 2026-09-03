import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { WorkspaceMembersView } from './WorkspaceMembersView';

const context = vi.fn();
const members = vi.fn();
const invitations = vi.fn();
const invite = vi.fn();
const removeMember = vi.fn();
const updateMemberRole = vi.fn();
const revokeInvitation = vi.fn();
const transferOwnership = vi.fn();
const deleteWorkspace = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

vi.mock('@/lib/api', () => ({
  scalar: {
    me: { context: () => context() as unknown },
    workspaces: {
      members: () => members() as unknown,
      invitations: () => invitations() as unknown,
      invite: (id: string, input: unknown) => invite(id, input) as unknown,
      removeMember: (id: string, userId: string) => removeMember(id, userId) as unknown,
      updateMemberRole: (id: string, userId: string, input: unknown) =>
        updateMemberRole(id, userId, input) as unknown,
      revokeInvitation: (id: string, invitationId: string) =>
        revokeInvitation(id, invitationId) as unknown,
      transferOwnership: (id: string, input: unknown) => transferOwnership(id, input) as unknown,
      delete: (id: string, input: unknown) => deleteWorkspace(id, input) as unknown,
    },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function sessionAs(role: 'owner' | 'admin' | 'member', kind: 'team' | 'personal' = 'team') {
  return {
    user: { id: 'u_me', email: 'ada@example.com', name: null },
    workspace: { id: 'ws_1', name: 'Thesis', ownerId: 'u_owner', kind, role },
  };
}

function member(over: Record<string, unknown> = {}) {
  return {
    userId: 'u_them',
    email: 'grace@example.com',
    name: null,
    role: 'member',
    joinedAt: '2026-09-03T10:00:00.000Z',
    ...over,
  };
}

describe('WorkspaceMembersView', () => {
  beforeEach(() => {
    context.mockReset().mockResolvedValue(sessionAs('owner'));
    members
      .mockReset()
      .mockResolvedValue([
        member({ userId: 'u_me', email: 'ada@example.com', role: 'owner' }),
        member(),
      ]);
    invitations.mockReset().mockResolvedValue([]);
    invite.mockReset();
    removeMember.mockReset().mockResolvedValue(undefined);
    updateMemberRole.mockReset().mockResolvedValue(member({ role: 'admin' }));
    revokeInvitation.mockReset().mockResolvedValue(undefined);
    transferOwnership.mockReset().mockResolvedValue([]);
    deleteWorkspace.mockReset().mockResolvedValue(undefined);
    replace.mockReset();
  });

  it('lists who is in the workspace', async () => {
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  /**
   * A personal workspace holds the things somebody never chose to share, so the screen explains
   * that rather than offering an invite form that the API would refuse.
   */
  it('says a personal workspace cannot be shared, and offers nothing', async () => {
    context.mockResolvedValue(sessionAs('owner', 'personal'));
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText(/cannot be shared/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument();
  });

  /** A control somebody cannot use is not shown, rather than shown and then refused. */
  it('does not offer inviting to a member', async () => {
    context.mockResolvedValue(sessionAs('member'));
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument();
  });

  it('lets only the owner change a role', async () => {
    context.mockResolvedValue(sessionAs('admin'));
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.queryByLabelText('Role for grace@example.com')).not.toBeInTheDocument();
  });

  it('sends an invitation', async () => {
    invite.mockResolvedValue({
      id: 'inv_1',
      email: 'hopper@example.com',
      role: 'member',
      invitedByEmail: 'ada@example.com',
      createdAt: '2026-09-03T10:00:00.000Z',
      expiresAt: '2026-09-10T10:00:00.000Z',
    });
    render(<WorkspaceMembersView />, { wrapper });

    await userEvent.type(await screen.findByLabelText('Email address'), 'hopper@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => {
      expect(invite).toHaveBeenCalledWith('ws_1', {
        email: 'hopper@example.com',
        role: 'member',
      });
    });
    expect(await screen.findByText('Invitation sent to hopper@example.com.')).toBeInTheDocument();
  });

  /**
   * The self-hosted case: no mail server, so the link comes back for the inviter to pass on.
   * Saying nothing would leave an invitation that never arrives.
   */
  it('shows the link to pass on when the server cannot send mail', async () => {
    invite.mockResolvedValue({
      id: 'inv_1',
      email: 'hopper@example.com',
      role: 'member',
      invitedByEmail: 'ada@example.com',
      createdAt: '2026-09-03T10:00:00.000Z',
      expiresAt: '2026-09-10T10:00:00.000Z',
      link: 'https://scalar.test/invitations/abc123',
    });
    render(<WorkspaceMembersView />, { wrapper });

    await userEvent.type(await screen.findByLabelText('Email address'), 'hopper@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByText('https://scalar.test/invitations/abc123')).toBeInTheDocument();
    expect(screen.getByText(/only for hopper@example.com/)).toBeInTheDocument();
  });

  it('removes somebody, and calls leaving what it is', async () => {
    render(<WorkspaceMembersView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(removeMember).toHaveBeenCalledWith('ws_1', 'u_them');
    });
  });

  /** The owner cannot leave, so the button that would strand the workspace is not there. */
  it('offers the owner no way to leave', async () => {
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument();
  });

  /**
   * Handing the workspace over is the only way an owner can ever leave, which is why it sits beside
   * the person receiving it. Two steps, because it cannot be undone without their help.
   */
  it('hands the workspace over in two steps', async () => {
    render(<WorkspaceMembersView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Make owner' }));
    expect(transferOwnership).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Yes, hand it to grace@example.com' }),
    );

    await waitFor(() => {
      expect(transferOwnership).toHaveBeenCalledWith('ws_1', { userId: 'u_them' });
    });
  });

  it('offers handing over only to the owner', async () => {
    context.mockResolvedValue(sessionAs('admin'));
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
  });

  /** Deleting takes everything, for everybody, with no undo, so the name is typed back. */
  it('deletes only after the name is typed', async () => {
    render(<WorkspaceMembersView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete workspace' }));
    await userEvent.type(screen.getByLabelText('Type Thesis to confirm'), 'Thesis');
    await userEvent.click(screen.getByRole('button', { name: 'Delete workspace' }));

    await waitFor(() => {
      expect(deleteWorkspace).toHaveBeenCalledWith('ws_1', { name: 'Thesis' });
    });
    expect(replace).toHaveBeenCalledWith('/today');
  });

  it('offers deletion only to the owner', async () => {
    context.mockResolvedValue(sessionAs('admin'));
    render(<WorkspaceMembersView />, { wrapper });

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Delete this workspace')).not.toBeInTheDocument();
  });

  it('lets a member leave', async () => {
    context.mockResolvedValue(sessionAs('member'));
    members.mockResolvedValue([
      member({ userId: 'u_owner', email: 'owner@example.com', role: 'owner' }),
      member({ userId: 'u_me', email: 'ada@example.com' }),
    ]);
    render(<WorkspaceMembersView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Leave' }));

    await waitFor(() => {
      expect(removeMember).toHaveBeenCalledWith('ws_1', 'u_me');
    });
  });
});
