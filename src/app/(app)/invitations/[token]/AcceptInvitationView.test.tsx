import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AcceptInvitationView } from './AcceptInvitationView';

const preview = vi.fn();
const accept = vi.fn();
const activate = vi.fn();
const context = vi.fn();
const replace = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    me: { context: () => context() as unknown },
    invitations: {
      preview: (token: string) => preview(token) as unknown,
      accept: (token: string) => accept(token) as unknown,
    },
    workspaces: { activate: (id: string) => activate(id) as unknown },
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AcceptInvitationView', () => {
  beforeEach(() => {
    preview.mockReset().mockResolvedValue({
      workspaceName: 'Thesis',
      invitedByEmail: 'ada@example.com',
      role: 'member',
      email: 'grace@example.com',
      expiresAt: '2026-09-10T10:00:00.000Z',
    });
    accept.mockReset().mockResolvedValue({ id: 'ws_1', name: 'Thesis' });
    activate.mockReset().mockResolvedValue({ id: 'ws_1' });
    context.mockReset().mockResolvedValue({
      user: { id: 'u_1', email: 'grace@example.com', name: null },
      workspace: { id: 'ws_own', name: 'Grace', ownerId: 'u_1', kind: 'personal', role: 'owner' },
    });
    replace.mockReset();
  });

  it('says who invited you, to what, and what joining means', async () => {
    render(<AcceptInvitationView token="tok" />, { wrapper });

    expect(await screen.findByText(/ada@example.com invited you to join/)).toBeInTheDocument();
    expect(
      screen.getByText(/does not give anybody access to your own workspace/),
    ).toBeInTheDocument();
  });

  /** Opening a link is not agreement. A page that joined on arrival makes forwarding a trap. */
  it('does not join until asked', async () => {
    render(<AcceptInvitationView token="tok" />, { wrapper });

    expect(await screen.findByRole('button', { name: 'Join Thesis' })).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();
  });

  it('joins and goes to Today', async () => {
    render(<AcceptInvitationView token="tok" />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Join Thesis' }));

    await waitFor(() => {
      expect(accept).toHaveBeenCalledWith('tok');
    });
    // Joining a workspace is going into it; staying put would be a link that appears to do nothing.
    await waitFor(() => {
      expect(activate).toHaveBeenCalledWith('ws_1');
      expect(replace).toHaveBeenCalledWith('/today');
    });
  });

  /**
   * The wrong-account case, which the API refuses anyway. Somebody has to be told which address to
   * use, not shown a refusal they cannot act on.
   */
  it('names the address the invitation was sent to, and will not let the wrong account join', async () => {
    context.mockResolvedValue({
      user: { id: 'u_2', email: 'mallory@example.com', name: null },
      workspace: { id: 'ws_own', name: 'M', ownerId: 'u_2', kind: 'personal', role: 'owner' },
    });
    render(<AcceptInvitationView token="tok" />, { wrapper });

    expect(
      await screen.findByText('This invitation was sent to grace@example.com.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Thesis' })).toBeDisabled();
  });

  it('says plainly when the invitation is spent', async () => {
    preview.mockRejectedValue(Object.assign(new Error('gone'), { status: 404, code: 'NOT_FOUND' }));
    render(<AcceptInvitationView token="tok" />, { wrapper });

    expect(await screen.findByText(/could not be opened|expired/)).toBeInTheDocument();
  });
});
