import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { NotificationsView } from './NotificationsView';

const list = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    notifications: {
      list: () => list() as unknown,
      markRead: (id: string) => markRead(id) as unknown,
      markAllRead: () => markAllRead() as unknown,
    },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function notification(over: Record<string, unknown> = {}) {
  return {
    id: 'n_1',
    kind: 'integration_items_imported',
    title: 'Canvas added 2 items to your Inbox',
    body: 'They arrived unfiled, so nothing has been scheduled or decided for you.',
    href: '/inbox',
    count: 2,
    occurredAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    readAt: null,
    ...over,
  };
}

describe('NotificationsView', () => {
  beforeEach(() => {
    list.mockReset();
    markRead.mockReset().mockResolvedValue(notification({ readAt: new Date().toISOString() }));
    markAllRead.mockReset().mockResolvedValue({ marked: 1 });
  });

  it('says what happened and when', async () => {
    list.mockResolvedValue({ data: [notification()], nextCursor: null, unreadCount: 1 });
    render(<NotificationsView />, { wrapper });

    expect(await screen.findByText('Canvas added 2 items to your Inbox')).toBeInTheDocument();
    expect(screen.getByText('4 hours ago')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Canvas added 2 items/ })).toHaveAttribute(
      'href',
      '/inbox',
    );
  });

  /** Reading it is going to look at the thing it is about; nobody should have to tidy up after. */
  it('marks it read on the way to the thing it is about', async () => {
    list.mockResolvedValue({ data: [notification()], nextCursor: null, unreadCount: 1 });
    render(<NotificationsView />, { wrapper });

    await userEvent.click(await screen.findByRole('link', { name: /Canvas added 2 items/ }));

    await waitFor(() => {
      expect(markRead).toHaveBeenCalledWith('n_1');
    });
  });

  it('clears the lot in one request', async () => {
    list.mockResolvedValue({ data: [notification()], nextCursor: null, unreadCount: 1 });
    render(<NotificationsView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Mark all read' }));

    await waitFor(() => {
      expect(markAllRead).toHaveBeenCalled();
    });
  });

  it('offers nothing to clear when nothing is unread', async () => {
    list.mockResolvedValue({
      data: [notification({ readAt: new Date().toISOString() })],
      nextCursor: null,
      unreadCount: 0,
    });
    render(<NotificationsView />, { wrapper });

    expect(await screen.findByText('Canvas added 2 items to your Inbox')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument();
  });

  /**
   * The empty state has to say what this page is for without implying something is broken, and
   * point at Today, which is where what needs somebody right now actually lives.
   */
  it('says where the other list is when there is nothing here', async () => {
    list.mockResolvedValue({ data: [], nextCursor: null, unreadCount: 0 });
    render(<NotificationsView />, { wrapper });

    expect(
      await screen.findByText('Nothing has happened while you were away.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/What needs you right now is on Today/)).toBeInTheDocument();
  });

  it('offers a retry when the list fails', async () => {
    list.mockRejectedValue(new Error('offline'));
    render(<NotificationsView />, { wrapper });

    expect(await screen.findByText('Notifications could not be loaded.')).toBeInTheDocument();
  });
});
