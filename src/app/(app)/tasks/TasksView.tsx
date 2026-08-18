'use client';

import type { TaskStatus } from '@scalar/sdk';
import { EmptyState, Spinner } from '@scalar/ui';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { QuickAddTask } from '@/components/tasks/QuickAddTask';
import { TaskList } from '@/components/tasks/TaskList';
import { useTasks } from '@/lib/queries/tasks';

type Filter = 'open' | 'done' | 'all';

const filterStatuses: Record<Filter, TaskStatus[] | undefined> = {
  open: ['inbox', 'todo', 'in_progress', 'blocked'],
  done: ['done'],
  all: undefined,
};

export function TasksView() {
  const [filter, setFilter] = useState<Filter>('open');
  const statuses = filterStatuses[filter];
  const tasks = useTasks({ limit: 100, ...(statuses ? { status: statuses } : {}) });

  return (
    <>
      <PageHeader
        title="Tasks"
        actions={
          <div
            role="tablist"
            aria-label="Filter tasks"
            className="flex items-center gap-1 rounded-md border border-border p-0.5"
          >
            {(['open', 'done', 'all'] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={filter === value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded px-2.5 py-1 text-[12px] capitalize ${filter === value ? 'bg-raised text-primary' : 'text-secondary hover:text-primary'}`}
              >
                {value}
              </button>
            ))}
          </div>
        }
      />
      <div className="mb-6">
        <QuickAddTask />
      </div>
      {tasks.isPending ? (
        <div className="py-10 text-center" aria-busy="true">
          <Spinner size={14} />
        </div>
      ) : tasks.isError ? (
        <ErrorNotice title="Tasks could not be loaded." onRetry={() => void tasks.refetch()} />
      ) : tasks.data.data.length === 0 ? (
        <EmptyState
          title={filter === 'done' ? 'Nothing completed yet.' : 'No tasks.'}
          description="Add one above, or press ⌘K and type a title."
        />
      ) : (
        <TaskList tasks={tasks.data.data} />
      )}
    </>
  );
}
