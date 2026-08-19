import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ConnectCanvas } from './ConnectCanvas';

const connectCanvas = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: { integrations: { connectCanvas: (input: unknown) => connectCanvas(input) as unknown } },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ConnectCanvas', () => {
  beforeEach(() => {
    connectCanvas.mockReset();
    connectCanvas.mockResolvedValue('acc_1');
  });

  it('says what Scalar will and will not do with the connection', () => {
    render(<ConnectCanvas />, { wrapper });
    expect(screen.getByText(/never submits work/)).toBeInTheDocument();
    expect(screen.getByText(/stored encrypted on your own server/)).toBeInTheDocument();
  });

  it('will not send an obviously incomplete form', () => {
    render(<ConnectCanvas />, { wrapper });
    expect(screen.getByRole('button', { name: 'Connect Canvas' })).toBeDisabled();
  });

  it('sends the address and the token, then forgets the token', async () => {
    render(<ConnectCanvas />, { wrapper });

    await userEvent.type(screen.getByLabelText(/institution/i), 'https://canvas.example.edu');
    const token = screen.getByLabelText(/Access token/);
    await userEvent.type(token, 'a-canvas-personal-access-token');
    await userEvent.click(screen.getByRole('button', { name: 'Connect Canvas' }));

    await waitFor(() => {
      expect(connectCanvas).toHaveBeenCalledWith({
        baseUrl: 'https://canvas.example.edu',
        accessToken: 'a-canvas-personal-access-token',
      });
    });
    // The field is cleared once it has been sent: nothing keeps a copy in the page.
    await waitFor(() => {
      expect(token).toHaveValue('');
    });
    expect(await screen.findByText(/Connected/)).toBeInTheDocument();
  });

  it('says plainly when Canvas turns it down', async () => {
    connectCanvas.mockRejectedValue(new Error('rejected'));
    render(<ConnectCanvas />, { wrapper });

    await userEvent.type(screen.getByLabelText(/institution/i), 'https://canvas.example.edu');
    await userEvent.type(screen.getByLabelText(/Access token/), 'not-a-real-token');
    await userEvent.click(screen.getByRole('button', { name: 'Connect Canvas' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas did not accept that');
  });
});
