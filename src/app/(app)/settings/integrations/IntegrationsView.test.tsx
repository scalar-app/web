import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { IntegrationsView } from './IntegrationsView';

const list = vi.fn();
const connectGoogle = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    integrations: {
      list: () => list() as unknown,
      connectGoogle: (provider: string) => connectGoogle(provider) as unknown,
      sync: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
    },
  },
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function account(over: Record<string, unknown> = {}) {
  return {
    id: 'acc-1',
    provider: 'gmail',
    displayName: 'mail@example.com',
    status: 'active',
    connectedAt: '2026-09-01T10:00:00.000Z',
    resources: [
      {
        resourceId: 'STARRED',
        resourceName: 'Starred',
        syncStatus: 'idle',
        lastSuccessfulSyncAt: '2026-09-01T10:05:00.000Z',
        lastAttemptAt: '2026-09-01T10:05:00.000Z',
        lastError: null,
        nextSyncAt: null,
      },
    ],
    ...over,
  };
}

describe('IntegrationsView', () => {
  beforeEach(() => {
    list.mockReset();
    connectGoogle.mockReset();
    connectGoogle.mockResolvedValue({ url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' });
    // The connect mutation navigates on success, which jsdom refuses to do; replacing the whole
    // object is the only way it lets the property be stubbed.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    });
    // jsdom does not implement <dialog>, which the disconnect confirmation is.
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('offers Gmail separately, and asks for the Gmail consent when asked for Gmail', async () => {
    list.mockResolvedValue([]);
    render(<IntegrationsView />, { wrapper });

    const button = await screen.findByRole('button', { name: 'Connect Gmail' });
    // What the panel promises about scope, which is the thing a person is deciding on.
    expect(screen.getByText(/never the body, and never sends mail/)).toBeInTheDocument();

    await userEvent.click(button);
    // Connecting mail must not go through the calendar's consent: separate products, separate
    // scopes, separate accounts.
    await waitFor(() => {
      expect(connectGoogle).toHaveBeenCalledWith('gmail');
    });
  });

  it('stops offering Gmail once a mailbox is connected', async () => {
    list.mockResolvedValue([account()]);
    render(<IntegrationsView />, { wrapper });

    expect(await screen.findByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Starred')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Gmail' })).not.toBeInTheDocument();
  });

  it('says messages, not events, when disconnecting a mailbox', async () => {
    list.mockResolvedValue([account()]);
    render(<IntegrationsView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));

    // The dialog used to promise to delete "events" whatever the provider was, which for Gmail
    // and Canvas described rows that do not exist.
    expect(await screen.findByText('Disconnect Gmail?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete messages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep messages' })).toBeInTheDocument();
  });
});
