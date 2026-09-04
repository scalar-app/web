import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MobileTopBar } from './MobileNav';

const context = vi.fn();
const listWorkspaces = vi.fn();
const activate = vi.fn();
const notifications = vi.fn();

vi.mock('next/navigation', () => ({ usePathname: () => '/today' }));

vi.mock('@/lib/api', () => ({
  scalar: {
    me: { context: () => context() as unknown },
    workspaces: {
      list: () => listWorkspaces() as unknown,
      activate: (id: string) => activate(id) as unknown,
      create: () => Promise.resolve({}),
    },
    notifications: { list: () => notifications() as unknown },
    tasks: { list: () => Promise.resolve({ data: [], nextCursor: null }) },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function workspace(over: Record<string, unknown> = {}) {
  return {
    id: 'ws_own',
    name: 'Ada',
    ownerId: 'u_1',
    kind: 'personal',
    role: 'owner',
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z',
    ...over,
  };
}

/**
 * The phone's top bar.
 *
 * The sidebar is hidden here, and it was the only place the workspace was named and the only way
 * to reach notifications. That was survivable while everybody had one workspace and no
 * notifications existed; sharing made it a way to write a private thought into a shared workspace
 * without ever seeing which one you were in.
 */
describe('MobileTopBar', () => {
  beforeEach(() => {
    context.mockReset().mockResolvedValue({
      user: { id: 'u_1', email: 'ada@example.com', name: null },
      workspace: workspace(),
    });
    listWorkspaces.mockReset().mockResolvedValue([workspace()]);
    activate.mockReset().mockResolvedValue(workspace());
    notifications.mockReset().mockResolvedValue({ data: [], nextCursor: null, unreadCount: 0 });
  });

  it('says which workspace you are in', async () => {
    render(<MobileTopBar onOpenCommand={vi.fn()} />, { wrapper });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
  });

  it('switches workspace from the phone', async () => {
    listWorkspaces.mockResolvedValue([
      workspace(),
      workspace({ id: 'ws_2', name: 'Thesis', kind: 'team', role: 'member' }),
    ]);
    render(<MobileTopBar onOpenCommand={vi.fn()} />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: /Ada/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Thesis/ }));

    await waitFor(() => {
      expect(activate).toHaveBeenCalledWith('ws_2');
    });
  });

  it('reaches notifications, and says how many are unread', async () => {
    notifications.mockResolvedValue({ data: [], nextCursor: null, unreadCount: 4 });
    render(<MobileTopBar onOpenCommand={vi.fn()} />, { wrapper });

    const link = await screen.findByRole('link', { name: 'Notifications, 4 unread' });
    expect(link).toHaveAttribute('href', '/notifications');
  });

  it('names the notifications link plainly when nothing is unread', async () => {
    render(<MobileTopBar onOpenCommand={vi.fn()} />, { wrapper });

    expect(await screen.findByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('still opens command and settings', async () => {
    const onOpenCommand = vi.fn();
    render(<MobileTopBar onOpenCommand={onOpenCommand} />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Open command' }));
    expect(onOpenCommand).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });
});
