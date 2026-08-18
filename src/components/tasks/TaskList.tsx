'use client';

import type { Task } from '@scalar/sdk';
import { useUpdateTask } from '@/lib/queries/tasks';
import { TaskRow } from './TaskRow';

export function TaskList({ tasks, onSelect }: { tasks: Task[]; onSelect?: (task: Task) => void }) {
  const update = useUpdateTask();
  return (
    <ul className="flex flex-col">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onSelect={onSelect}
          onToggleDone={(t, done) =>
            update.mutate({ id: t.id, input: { status: done ? 'done' : 'todo' } })
          }
        />
      ))}
    </ul>
  );
}
