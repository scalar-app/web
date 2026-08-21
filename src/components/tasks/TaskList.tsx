'use client';

import type { Task } from '@scalar/sdk';
import { useUpdateTask } from '@/lib/queries/tasks';
import { TaskRow } from './TaskRow';

export function TaskList({ tasks, onSelect }: { tasks: Task[]; onSelect?: (task: Task) => void }) {
  const update = useUpdateTask();
  return (
    <>
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
      {/* The update is optimistic and rolls back when it fails, so without this the checkbox ticks
          and then quietly unticks itself and the person is left to wonder whether they missed. */}
      {update.isError ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          Could not save that change. Try again.
        </p>
      ) : null}
    </>
  );
}
