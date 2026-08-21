import { ScalarApiError, ScalarNetworkError } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppShell } from './AppShell';

const replace = vi.fn();
const me = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/today',
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock('@/lib/api', () => ({
  scalar: {
    me: { get: () => me() },
    tasks: { list: () => Promise.resolve({ data: [], nextCursor: null }) },
    auth: { logout: () => Promise.resolve() },
  },
  isApiConfigured: () => true,
  apiUrl: () => 'http://localhost:8080',
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderShell() {
  return render(
    <AppShell>
      <p>Routed screen</p>
    </AppShell>,
    { wrapper },
  );
}

const apiError = (status: number) => new ScalarApiError({ status, code: 'error', message: 'nope' });

describe('AppShell', () => {
  beforeEach(() => {
    replace.mockClear();
    me.mockReset();
  });

  it('shows the app once the session resolves', async () => {
    me.mockResolvedValue({ id: 'u1', email: 'sam@example.com' });
    renderShell();

    expect(await screen.findByText('Routed screen')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a 401 to the sign in screen', async () => {
    me.mockRejectedValue(apiError(401));
    renderShell();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('says the server is unreachable rather than signing the user out', async () => {
    me.mockRejectedValue(new ScalarNetworkError('offline'));
    renderShell();

    // useSession retries a fault twice before giving up, so this waits out that backoff.
    expect(await screen.findByRole('alert', {}, { timeout: 10_000 })).toHaveTextContent(
      'Cannot reach your Scalar server.',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('treats a server fault as unreachable, not as signed out', async () => {
    me.mockRejectedValue(apiError(500));
    renderShell();

    // useSession retries a fault twice before giving up, so this waits out that backoff.
    expect(await screen.findByRole('alert', {}, { timeout: 10_000 })).toHaveTextContent(
      'Cannot reach your Scalar server.',
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
