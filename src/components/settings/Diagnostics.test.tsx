import type { Diagnostics as DiagnosticsData } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Diagnostics } from './Diagnostics';

const get = vi.fn();

vi.mock('@/lib/api', () => ({ scalar: { diagnostics: { get: () => get() as unknown } } }));

function report(over: Partial<DiagnosticsData['components']> = {}): DiagnosticsData {
  return {
    version: '0.1.0',
    schemaVersion: 8,
    components: {
      database: { status: 'ok', detail: 'Connected.' },
      redis: { status: 'ok', detail: 'Connected.' },
      worker: { status: 'ok', detail: 'Checked in 20 seconds ago.' },
      ai: {
        status: 'not_configured',
        detail: 'No AI provider. Everything except Ask Scalar works normally.',
      },
      email: {
        status: 'not_configured',
        detail: 'No SMTP. Sign in links are returned by the API instead.',
      },
      integrations: { status: 'not_configured', detail: 'Nothing connected.' },
      ...over,
    },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Diagnostics', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue(report());
  });

  it('shows every component with a sentence, plus version and schema', async () => {
    render(<Diagnostics />, { wrapper });

    expect(await screen.findByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('Checked in 20 seconds ago.')).toBeInTheDocument();
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
    expect(screen.getByText('8 migrations applied')).toBeInTheDocument();
  });

  it('says what to do when a component is broken', async () => {
    get.mockResolvedValue(
      report({
        worker: {
          status: 'error',
          detail: 'The worker last checked in 4 hours ago. Syncs are probably stopped.',
        },
      }),
    );
    render(<Diagnostics />, { wrapper });

    expect(await screen.findByText(/Syncs are probably stopped/)).toBeInTheDocument();
  });

  it('does not dress an unconfigured optional feature up as a failure', async () => {
    render(<Diagnostics />, { wrapper });

    const ai = await screen.findByText(/Everything except Ask Scalar works normally/);
    expect(ai).toBeInTheDocument();
    // Neutral rather than danger: nothing is wrong with a Scalar that has no AI.
    expect(screen.queryByLabelText('error')).not.toBeInTheDocument();
  });

  it('says so when the server cannot be checked at all', async () => {
    get.mockRejectedValue(new Error('offline'));
    render(<Diagnostics />, { wrapper });

    expect(await screen.findByText('This server could not be checked.')).toBeInTheDocument();
  });
});
