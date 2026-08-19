import type { Task } from '@scalar/sdk';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskRow } from './TaskRow';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    workspaceId: 'w1',
    spaceId: null,
    projectId: null,
    title: 'Finish CS assignment',
    description: null,
    status: 'todo',
    priority: 'high',
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

describe('TaskRow', () => {
  it('shows title, priority and an accessible done toggle', async () => {
    const onToggle = vi.fn();
    render(
      <ul>
        <TaskRow task={task()} onToggleDone={onToggle} />
      </ul>,
    );
    expect(screen.getByText('Finish CS assignment')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Mark "Finish CS assignment" done' }),
    );
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), true);
  });

  it('marks overdue tasks and hides badges once done', () => {
    const { rerender } = render(
      <ul>
        <TaskRow
          task={task({ dueAt: '2020-01-01T00:00:00.000Z' })}
          onToggleDone={() => undefined}
        />
      </ul>,
    );
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    rerender(
      <ul>
        <TaskRow
          task={task({ dueAt: '2020-01-01T00:00:00.000Z', status: 'done' })}
          onToggleDone={() => undefined}
        />
      </ul>,
    );
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /not done/ })).toBeChecked();
  });
});
