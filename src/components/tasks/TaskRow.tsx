'use client';

import type { Task } from '@scalar/sdk';
import { Badge, Checkbox, cx } from '@scalar/ui';
import { describeDue } from '@/lib/time';

export interface TaskRowProps {
  task: Task;
  onToggleDone: (task: Task, done: boolean) => void;
  onSelect?: (task: Task) => void;
}

const priorityLabel: Record<Task['priority'], string | null> = {
  none: null,
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function TaskRow({ task, onToggleDone, onSelect }: TaskRowProps) {
  const done = task.status === 'done';
  const due = describeDue(task.dueAt);
  const priority = priorityLabel[task.priority];

  return (
    <li className="group flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
      <Checkbox
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        checked={done}
        onChange={(e) => onToggleDone(task, e.target.checked)}
      />
      <button
        type="button"
        onClick={onSelect ? () => onSelect(task) : undefined}
        className={cx(
          'flex flex-1 items-center justify-between gap-4 text-left text-[13px]',
          done ? 'text-muted line-through' : 'text-primary',
        )}
      >
        <span className="truncate">{task.title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {priority && !done ? (
            <Badge
              tone={task.priority === 'urgent' || task.priority === 'high' ? 'yellow' : 'neutral'}
            >
              {priority}
            </Badge>
          ) : null}
          {due && !done ? <Badge tone={due.tone}>{due.label}</Badge> : null}
        </span>
      </button>
    </li>
  );
}
