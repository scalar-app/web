import type { Space, Task } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { InboxView } from './InboxView';

const listInbox = vi.fn();
const updateTask = vi.fn();
const acceptSuggestion = vi.fn();
const dismissSuggestion = vi.fn();
const listSpaces = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    tasks: {
      list: (q: unknown) => listInbox(q) as unknown,
      update: (id: string, input: unknown) => updateTask(id, input) as unknown,
    },
    spaces: { list: (q: unknown) => listSpaces(q) as unknown },
    inbox: {
      list: (q: unknown) => listInbox(q) as unknown,
      accept: (taskId: string, input: unknown) => acceptSuggestion(taskId, input) as unknown,
      dismiss: (taskId: string, input: unknown) => dismissSuggestion(taskId, input) as unknown,
    },
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
  listInbox.mockReset();
  updateTask.mockReset();
  listSpaces.mockReset();
  acceptSuggestion.mockReset();
  dismissSuggestion.mockReset();
  listInbox.mockResolvedValue({ data: [{ task: task(), suggestion: null }], nextCursor: null });
  acceptSuggestion.mockResolvedValue({ task: task({ status: 'todo' }) });
  dismissSuggestion.mockResolvedValue({ task: task() });
  listSpaces.mockResolvedValue({ data: [space()], nextCursor: null });
  updateTask.mockResolvedValue(task({ status: 'todo' }));
});

describe('InboxView', () => {
  it('asks the inbox for items and their suggestions', async () => {
    render(<InboxView />, { wrapper });

    await waitFor(() => {
      expect(listInbox).toHaveBeenCalled();
    });
  });

  it('shows a suggestion as advice, having applied nothing', async () => {
    listInbox.mockResolvedValue({
      data: [
        {
          task: task(),
          suggestion: {
            id: null,
            origin: 'planner',
            source: 'scalar',
            reason: 'Fits before it is due, in 90 minutes of free working time.',
            values: {
              scheduledStart: '2026-08-20T09:00:00.000Z',
              scheduledEnd: '2026-08-20T10:30:00.000Z',
              estimatedMinutes: 90,
            },
          },
        },
      ],
      nextCursor: null,
    });
    render(<InboxView />, { wrapper });

    expect(await screen.findByText(/Fits before it is due/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(acceptSuggestion).not.toHaveBeenCalled();
  });

  it('accepts what is on screen, including a change the person made', async () => {
    listInbox.mockResolvedValue({
      data: [
        {
          task: task(),
          suggestion: {
            id: '99999999-9999-4999-8999-999999999999',
            origin: 'integration',
            source: 'canvas',
            reason: null,
            values: { estimatedMinutes: 90 },
          },
        },
      ],
      nextCursor: null,
    });
    render(<InboxView />, { wrapper });

    const minutes = await screen.findByLabelText(/Estimated minutes/);
    await userEvent.clear(minutes);
    await userEvent.type(minutes, '30');
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(acceptSuggestion).toHaveBeenCalled();
    });
    expect(acceptSuggestion.mock.calls[0]?.[1]).toMatchObject({
      values: { estimatedMinutes: 30 },
      suggestionId: '99999999-9999-4999-8999-999999999999',
    });
  });

  it('turning down the advice leaves the item alone', async () => {
    listInbox.mockResolvedValue({
      data: [
        {
          task: task(),
          suggestion: {
            id: '99999999-9999-4999-8999-999999999999',
            origin: 'integration',
            source: 'canvas',
            reason: null,
            values: { estimatedMinutes: 90 },
          },
        },
      ],
      nextCursor: null,
    });
    render(<InboxView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Not this' }));

    await waitFor(() => {
      expect(dismissSuggestion).toHaveBeenCalled();
    });
    expect(updateTask).not.toHaveBeenCalled();
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
    listInbox.mockResolvedValue({ data: [], nextCursor: null });
    render(<InboxView />, { wrapper });

    expect(await screen.findByText('Inbox zero.')).toBeInTheDocument();
  });
});
