import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AiStatus } from './AiStatus';

const status = vi.fn();

vi.mock('@/lib/api', () => ({ scalar: { command: { status: () => status() as unknown } } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AiStatus', () => {
  beforeEach(() => {
    status.mockReset();
  });

  it('names the provider and says where requests go', async () => {
    status.mockResolvedValue({ configured: true, provider: 'ollama' });
    render(<AiStatus />, { wrapper });

    expect(await screen.findByText('Ollama (local)')).toBeInTheDocument();
    expect(
      screen.getByText(/nothing passes through infrastructure run by Scalar/),
    ).toBeInTheDocument();
  });

  it('says what still works when nothing is configured', async () => {
    status.mockResolvedValue({ configured: false, provider: null });
    render(<AiStatus />, { wrapper });

    expect(await screen.findByText('No AI provider is configured.')).toBeInTheDocument();
    expect(screen.getByText(/all work without one/)).toBeInTheDocument();
    expect(screen.getByText('AI_PROVIDER')).toBeInTheDocument();
  });

  it('does not pretend to know when the check fails', async () => {
    status.mockRejectedValue(new Error('offline'));
    render(<AiStatus />, { wrapper });

    expect(await screen.findByText(/could not check which provider/)).toBeInTheDocument();
  });
});
