'use client';

import { Button, Input } from '@scalar/ui';
import { useState, type FormEvent } from 'react';
import { useCreateTask } from '@/lib/queries/tasks';

export function QuickAddTask({ spaceId }: { spaceId?: string | null }) {
  const [title, setTitle] = useState('');
  const create = useCreateTask();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    create.mutate(
      { title: trimmed, status: 'todo', ...(spaceId ? { spaceId } : {}) },
      { onSuccess: () => setTitle('') },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task"
        aria-label="New task title"
        className="flex-1"
        invalid={create.isError}
      />
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={create.isPending}
        disabled={!title.trim()}
      >
        Add
      </Button>
      {create.isError ? (
        <span role="alert" className="text-[13px] text-danger">
          Could not add. Try again.
        </span>
      ) : null}
    </form>
  );
}
