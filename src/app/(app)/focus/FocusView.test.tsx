import type { FocusSession } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { FocusView } from './FocusView';

const currentFocus = vi.fn();
const startFocus = vi.fn();
const completeFocus = vi.fn();
const cancelFocus = vi.fn();
const listTasks = vi.fn();
const setImmersive = vi.fn();

vi.mock('@/components/shell/immersive', async () => {
  const react = await import('react');
  return {
    useImmersive: (active: boolean) => {
      react.useEffect(() => {
        setImmersive(active);
        return () => {
          setImmersive(false);
        };
      }, [active]);
    },
  };
});

vi.mock('@/lib/api', () => ({
  scalar: {
    focus: {
      current: () => currentFocus() as unknown,
      start: (input: unknown) => startFocus(input) as unknown,
      complete: (id: string, input: unknown) => completeFocus(id, input) as unknown,
      cancel: (id: string) => cancelFocus(id) as unknown,
      sessions: () => Promise.resolve({ data: [], nextCursor: null }),
    },
    tasks: { list: (q: unknown) => listTasks(q) as unknown },
  },
}));

const session: FocusSession = {
  id: '11111111-1111-4111-8111-111111111111',
  taskId: '22222222-2222-4222-8222-222222222222',
  taskTitle: 'Finish problem set',
  status: 'active',
  plannedMinutes: 45,
  startedAt: '2026-08-19T09:00:00.000Z',
  endedAt: null,
  actualMinutes: null,
  notes: null,
};

function task(id: string, title: string, estimatedMinutes: number | null = null) {
  return {
    id,
    workspaceId: 'w1',
    spaceId: null,
    projectId: null,
    title,
    description: null,
    status: 'todo' as const,
    priority: 'none' as const,
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes,
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
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('FocusView', () => {
  beforeEach(() => {
    currentFocus.mockReset();
    startFocus.mockReset();
    completeFocus.mockReset();
    cancelFocus.mockReset();
    listTasks.mockReset();
    setImmersive.mockReset();
    currentFocus.mockResolvedValue(null);
    listTasks.mockResolvedValue({
      data: [task('22222222-2222-4222-8222-222222222222', 'Finish problem set', 45)],
      nextCursor: null,
    });
  });

  it('offers open work to start on when nothing is running', async () => {
    render(<FocusView />, { wrapper });

    expect(await screen.findByText('Pick one thing.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(startFocus).toHaveBeenCalledWith({
        taskId: '22222222-2222-4222-8222-222222222222',
      });
    });
  });

  it('shows only the task and the time while a session runs', async () => {
    currentFocus.mockResolvedValue(session);
    render(<FocusView />, { wrapper });

    expect(await screen.findByRole('heading', { name: 'Finish problem set' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    // No page header, no task list: the screen is one thing.
    expect(screen.queryByText('Pick one thing.')).not.toBeInTheDocument();
  });

  it('asks the shell to get out of the way, and puts it back afterwards', async () => {
    currentFocus.mockResolvedValue(session);
    const { unmount } = render(<FocusView />, { wrapper });

    await screen.findByRole('timer');
    expect(setImmersive).toHaveBeenCalledWith(true);

    // Leaving the screen must never strand someone in an app with no navigation.
    unmount();
    expect(setImmersive).toHaveBeenLastCalledWith(false);
  });

  it('keeps the navigation while there is nothing to focus on', async () => {
    render(<FocusView />, { wrapper });

    await screen.findByText('Pick one thing.');
    expect(setImmersive).not.toHaveBeenCalledWith(true);
  });

  it('offers a way back that leaves the session running', async () => {
    currentFocus.mockResolvedValue(session);
    render(<FocusView />, { wrapper });

    const leave = await screen.findByRole('link', { name: /Leave this open/ });
    expect(leave).toHaveAttribute('href', '/today');
    expect(completeFocus).not.toHaveBeenCalled();
    expect(cancelFocus).not.toHaveBeenCalled();
  });

  it('ends a session without finishing the work', async () => {
    currentFocus.mockResolvedValue(session);
    completeFocus.mockResolvedValue({
      session: { ...session, status: 'completed', actualMinutes: 47 },
      taskCompleted: false,
      estimateUpdated: false,
      typicalMinutes: null,
    });
    render(<FocusView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'End session' }));

    await waitFor(() => {
      expect(completeFocus).toHaveBeenCalled();
    });
    expect(completeFocus.mock.calls[0]?.[1]).not.toMatchObject({ completeTask: true });
    expect(await screen.findByText('Session ended')).toBeInTheDocument();
  });

  it('finishes the work when asked, and keeps the notes', async () => {
    currentFocus.mockResolvedValue(session);
    completeFocus.mockResolvedValue({
      session: { ...session, status: 'completed', actualMinutes: 47 },
      taskCompleted: true,
      estimateUpdated: false,
      typicalMinutes: null,
    });
    render(<FocusView />, { wrapper });

    await userEvent.type(await screen.findByLabelText('Notes'), 'Chain rule on #6');
    await userEvent.click(screen.getByRole('button', { name: 'Complete task' }));

    await waitFor(() => {
      expect(completeFocus).toHaveBeenCalled();
    });
    expect(completeFocus.mock.calls[0]?.[1]).toMatchObject({
      completeTask: true,
      notes: 'Chain rule on #6',
    });
    expect(await screen.findByText('Finished')).toBeInTheDocument();
  });

  it('says when it filled in an estimate that was empty', async () => {
    currentFocus.mockResolvedValue(session);
    completeFocus.mockResolvedValue({
      session: { ...session, status: 'completed', actualMinutes: 47 },
      taskCompleted: false,
      estimateUpdated: true,
      typicalMinutes: null,
    });
    render(<FocusView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'End session' }));

    expect(await screen.findByText(/had no estimate/)).toBeInTheDocument();
    expect(screen.getByText(/You can change it on the task/)).toBeInTheDocument();
  });

  it('discards a session without recording the time', async () => {
    currentFocus.mockResolvedValue(session);
    cancelFocus.mockResolvedValue({ ...session, status: 'cancelled' });
    render(<FocusView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Discard' }));

    await waitFor(() => {
      expect(cancelFocus).toHaveBeenCalledWith(session.id);
    });
    expect(completeFocus).not.toHaveBeenCalled();
  });

  it('keeps the session running when ending it fails', async () => {
    currentFocus.mockResolvedValue(session);
    completeFocus.mockRejectedValue(new Error('offline'));
    render(<FocusView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'End session' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('It is still running.');
    expect(screen.getByRole('timer')).toBeInTheDocument();
  });

  it('says so plainly when there is nothing to focus on', async () => {
    listTasks.mockResolvedValue({ data: [], nextCursor: null });
    render(<FocusView />, { wrapper });

    expect(await screen.findByText('Nothing to focus on.')).toBeInTheDocument();
  });
});
