import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/today',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  scalar: {
    me: { get: () => Promise.resolve({ id: 'u1', email: 'sam@example.com' }) },
    tasks: {
      list: () => Promise.resolve({ data: [{ id: 't1' }, { id: 't2' }], nextCursor: null }),
    },
    auth: { logout: () => Promise.resolve() },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderSidebar() {
  return render(<Sidebar onOpenCommand={vi.fn()} />, { wrapper });
}

describe('Sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts expanded when nothing has been remembered', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapses to icons and keeps every destination named', async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    // The labels are gone from the page, but the links still answer to their names.
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps the waiting count in the accessible name once the badge is gone', async () => {
    renderSidebar();
    expect(await screen.findByLabelText('2 waiting')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(screen.getByRole('link', { name: 'Inbox, 2 waiting' })).toBeInTheDocument();
  });

  it('remembers the choice so a reload does not undo it', async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(window.localStorage.getItem('scalar.sidebarCollapsed')).toBe('1');

    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(window.localStorage.getItem('scalar.sidebarCollapsed')).toBe('0');
  });

  it('toggles on the shortcut, and leaves it alone while somebody is typing', async () => {
    renderSidebar();
    // jsdom is not an Apple platform, so `mod` resolves to Control here.
    await userEvent.keyboard('{Control>}\\{/Control}');

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();

    const field = document.createElement('input');
    document.body.append(field);
    field.focus();
    await userEvent.keyboard('{Control>}\\{/Control}');

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    field.remove();
  });

  it('comes back collapsed after a reload', () => {
    // What a reload leaves behind: the preference in storage and nothing in memory.
    window.localStorage.setItem('scalar.sidebarCollapsed', '1');
    renderSidebar();

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });
});
