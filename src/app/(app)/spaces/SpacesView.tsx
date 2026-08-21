'use client';

import { Button, EmptyState, Input, Spinner } from '@scalar/ui';
import { useState, type FormEvent } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { useCreateSpace, useSpaces } from '@/lib/queries/spaces';

export function SpacesView() {
  const spaces = useSpaces();
  const create = useCreateSpace();
  const [name, setName] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({ name: trimmed }, { onSuccess: () => setName('') });
  }

  return (
    <>
      <PageHeader
        title="Spaces"
        description="Contexts that group tasks, events and sources. Courses and repositories will map here."
      />
      <form onSubmit={onSubmit} className="mb-6 flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New space"
          aria-label="New space name"
          className="flex-1"
          invalid={create.isError}
        />
        <Button type="submit" variant="primary" loading={create.isPending} disabled={!name.trim()}>
          Create
        </Button>
        {create.isError ? (
          <span role="alert" className="text-[13px] text-danger">
            Could not create. Try again.
          </span>
        ) : null}
      </form>
      {spaces.isPending ? (
        <div className="py-10 text-center" aria-busy="true">
          <Spinner size={14} />
        </div>
      ) : spaces.isError ? (
        <ErrorNotice title="Spaces could not be loaded." onRetry={() => void spaces.refetch()} />
      ) : spaces.data.data.length === 0 ? (
        <EmptyState
          title="No spaces yet."
          description="Create one for a course, a project or an area of your life."
        />
      ) : (
        <ul className="flex flex-col">
          {spaces.data.data.map((space) => (
            <li
              key={space.id}
              className="flex items-center gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: space.color ?? 'var(--sc-color-text-muted)' }}
              />
              <span className="text-primary">{space.name}</span>
              {space.description ? (
                <span className="truncate text-secondary">{space.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
