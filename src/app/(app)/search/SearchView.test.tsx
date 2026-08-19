import type { SearchResults } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SearchView } from './SearchView';

const query = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }));
vi.mock('@/lib/api', () => ({
  scalar: { search: { query: (input: unknown) => query(input) as unknown } },
}));

function results(over: Partial<SearchResults> = {}): SearchResults {
  return {
    query: 'problem',
    tasks: [],
    events: [],
    spaces: [],
    counts: { tasks: 0, events: 0, spaces: 0, total: 0 },
    ...over,
  } as SearchResults;
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue(results());
  searchParams = new URLSearchParams();
});

describe('SearchView', () => {
  it('does not search until the term is long enough', async () => {
    render(<SearchView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Search'), 'a');

    expect(await screen.findByText(/at least 2 characters/)).toBeInTheDocument();
    expect(query).not.toHaveBeenCalled();
  });

  it('searches once typing settles rather than per keystroke', async () => {
    render(<SearchView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Search'), 'problem');

    await waitFor(() => {
      expect(query).toHaveBeenCalledWith({ q: 'problem' });
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('groups results by kind', async () => {
    query.mockResolvedValue(
      results({
        tasks: [{ id: 't1', title: 'Finish problem set 4', status: 'todo', dueAt: null }],
        spaces: [{ id: 's1', name: 'Problem sets', description: null }],
        counts: { tasks: 1, events: 0, spaces: 1, total: 2 },
      } as Partial<SearchResults>),
    );
    render(<SearchView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Search'), 'problem');

    expect(await screen.findByText('Finish problem set 4')).toBeInTheDocument();
    expect(screen.getByText('Problem sets')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tasks/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Spaces/ })).toBeInTheDocument();
    // Nothing matched, so the Events group is not rendered at all.
    expect(screen.queryByRole('heading', { name: /Events/ })).not.toBeInTheDocument();
  });

  it('says plainly when nothing matches', async () => {
    render(<SearchView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Search'), 'zzzz');

    expect(await screen.findByText(/Nothing matches/)).toBeInTheDocument();
  });

  it('runs a term handed over in the query string', async () => {
    searchParams = new URLSearchParams('q=calculus');
    render(<SearchView />, { wrapper });

    await waitFor(() => {
      expect(query).toHaveBeenCalledWith({ q: 'calculus' });
    });
  });
});
