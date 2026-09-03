import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

const list = vi.fn();
const activate = vi.fn();
const create = vi.fn();
const context = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    me: { context: () => context() as unknown },
    workspaces: {
      list: () => list() as unknown,
      activate: (id: string) => activate(id) as unknown,
      create: (input: unknown) => create(input) as unknown,
    },
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

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    list.mockReset().mockResolvedValue([workspace()]);
    activate.mockReset().mockResolvedValue(workspace());
    create.mockReset();
    context.mockReset().mockResolvedValue({
      user: { id: 'u_1', email: 'ada@example.com', name: null },
      workspace: workspace(),
    });
  });

  it('says which workspace you are in', async () => {
    render(<WorkspaceSwitcher collapsed={false} />, { wrapper });

    expect(await screen.findByText('Ada')).toBeInTheDocument();
  });

  it('switches to another workspace', async () => {
    list.mockResolvedValue([workspace(), workspace({ id: 'ws_2', name: 'Thesis', kind: 'team' })]);
    render(<WorkspaceSwitcher collapsed={false} />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: /Ada/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Thesis/ }));

    await waitFor(() => {
      expect(activate).toHaveBeenCalledWith('ws_2');
    });
  });

  /** Switching to where you already are is a request that changes nothing. */
  it('does not switch to the workspace already open', async () => {
    list.mockResolvedValue([workspace(), workspace({ id: 'ws_2', name: 'Thesis', kind: 'team' })]);
    render(<WorkspaceSwitcher collapsed={false} />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: /Ada/ }));
    await userEvent.click(
      await screen.findAllByRole('button', { name: /Ada/ }).then((all) => all[1] as HTMLElement),
    );

    expect(activate).not.toHaveBeenCalled();
  });

  it('creates a shared workspace and goes into it', async () => {
    create.mockResolvedValue(workspace({ id: 'ws_new', name: 'Thesis', kind: 'team' }));
    render(<WorkspaceSwitcher collapsed={false} />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: /Ada/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'New shared workspace' }));
    await userEvent.type(await screen.findByLabelText('Name this workspace'), 'Thesis{Enter}');

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ name: 'Thesis' });
    });
    // Nobody makes a workspace in order to stay where they were.
    await waitFor(() => {
      expect(activate).toHaveBeenCalledWith('ws_new');
    });
  });
});
