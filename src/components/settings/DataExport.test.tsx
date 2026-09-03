import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { DataExport } from './DataExport';

const download = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: { dataExport: { download: () => download() as unknown } },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('DataExport', () => {
  /** What the component handed the browser to save: the name and the object URL, not the element. */
  let saved: { download: string; href: string } | null = null;

  beforeEach(() => {
    download.mockReset();
    saved = null;
    // jsdom implements neither, and both are how a file reaches the disk.
    URL.createObjectURL = vi.fn(() => 'blob:scalar/1');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn(function click(this: HTMLAnchorElement) {
      saved = { download: this.download, href: this.href };
    });
  });

  function file(filename: string, body = '{"scalar":{}}') {
    return { filename, response: new Response(body) };
  }

  it('saves the file under the name the server asked for', async () => {
    download.mockResolvedValue(file('scalar-export-2026-09-03.json'));
    render(<DataExport />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    await waitFor(() => {
      expect(saved).not.toBeNull();
    });
    expect(saved?.download).toBe('scalar-export-2026-09-03.json');
    expect(saved?.href).toBe('blob:scalar/1');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(await screen.findByText('Saved as scalar-export-2026-09-03.json')).toBeInTheDocument();
  });

  /**
   * What the panel promises about scope. Someone deciding whether it is safe to email this file to
   * themselves is deciding on this sentence, so it is worth a test of its own.
   */
  it('says that sessions and access tokens are not in the file', async () => {
    download.mockResolvedValue(file('scalar-export.json'));
    render(<DataExport />, { wrapper });

    expect(
      screen.getByText(/access tokens for connected accounts are not included/),
    ).toBeInTheDocument();
  });

  it('offers a retry when the download fails', async () => {
    download.mockRejectedValue(new Error('offline'));
    render(<DataExport />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));

    expect(await screen.findByText('The export could not be downloaded.')).toBeInTheDocument();
    // And nothing was handed to the browser to save.
    expect(saved).toBeNull();
  });
});
