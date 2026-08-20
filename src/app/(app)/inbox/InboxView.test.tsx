import type { Space, Task } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { InboxView } from './InboxView';

const listTasks = vi.fn();
const updateTask = vi.fn();
const listSpaces = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    tasks: {
      list: (q: unknown) => listTasks(q) as unknown,
      update: (id: string, input: unknown) => updateTask(id, input) as unknown,
    },
    spaces: { list: (q: unknown) => listSpaces(q) as unknown },
  },
}));

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    workspaceId: 'w1',
    spaceId: null,
    projectId: null,
    title: 'Email the TA',
    description: null,
    status: 'inbox',
    priority: 'none',
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: null,
    sourceId: null,
    source: 'scalar',
    integrationAccountId: null,
    sourceObjectId: null,
    sourceUrl: null,
    sourceUpdatedAt: null,
    lastSyncedAt: null,
    parentTaskId: null,
    createdBy: 'u1',
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    completedAt: null,
    ...over,
  };
}

function space(over: Partial<Space> = {}): Space {
  return {
    id: 's1',
    workspaceId: 'w1',
    name: 'Linear Algebra',
    description: null,
    color: null,
    archivedAt: null,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
    ...over,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  listTasks.mockReset();
  updateTask.mockReset();
  listSpaces.mockReset();
  listTasks.mockResolvedValue({ data: [task()], nextCursor: null });
  listSpaces.mockResolvedValue({ data: [space()], nextCursor: null });
  updateTask.mockResolvedValue(task({ status: 'todo' }));
});

describe('InboxView', () => {
  it('asks only for items still waiting to be filed', async () => {
    render(<InboxView />, { wrapper });

    await waitFor(() => {
      expect(listTasks).toHaveBeenCalledWith(expect.objectContaining({ status: ['inbox'] }));
    });
  });

  it('lists what needs triage and counts it', async () => {
    render(<InboxView />, { wrapper });

    expect(await screen.findByText('Email the TA')).toBeInTheDocument();
    expect(screen.getByText('1 to triage')).toBeInTheDocument();
  });

  it('keeping an item moves it out of the inbox', async () => {
    render(<InboxView />, { wrapper });
    await screen.findByText('Email the TA');

    await userEvent.click(screen.getByRole('button', { name: /^Keep/ }));

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith('t1', { status: 'todo' });
    });
  });

  it('dismissing cancels rather than deletes, so nothing is lost', async () => {
    render(<InboxView />, { wrapper });
    await screen.findByText('Email the TA');

    await userEvent.click(screen.getByRole('button', { name: /^Dismiss/ }));

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith('t1', { status: 'cancelled' });
    });
  });

  it('filing into a space also takes it out of the inbox', async () => {
    render(<InboxView />, { wrapper });
    await screen.findByText('Email the TA');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Move/ }), 's1');

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith('t1', { status: 'todo', spaceId: 's1' });
    });
  });

  it('does not offer archived spaces', async () => {
    listSpaces.mockResolvedValue({
      data: [space(), space({ id: 's2', name: 'Old course', archivedAt: '2026-01-01T00:00:00Z' })],
      nextCursor: null,
    });
    render(<InboxView />, { wrapper });
    await screen.findByText('Email the TA');

    expect(screen.getByRole('option', { name: 'Linear Algebra' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Old course' })).not.toBeInTheDocument();
  });

  it('says so when there is nothing to triage', async () => {
    listTasks.mockResolvedValue({ data: [], nextCursor: null });
    render(<InboxView />, { wrapper });

    expect(await screen.findByText('Inbox zero.')).toBeInTheDocument();
  });
});
