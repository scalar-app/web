'use client';

import type { Event, Space, Task } from '@scalar/sdk';
import { Badge, EmptyState, Input, Spinner } from '@scalar/ui';
import { Calendar, LayoutGrid, Search as SearchIcon, SquareCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { MIN_SEARCH_LENGTH, useSearch } from '@/lib/queries/search';
import { describeDue, formatDay, formatTime } from '@/lib/time';

/** Waits for typing to settle, so refining a term does not fire a request per keystroke. */
function useDebounced(value: string, delay = 250): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

function Group({
  icon,
  label,
  count,
  children,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
        {icon}
        {label}
        <span className="font-mono tracking-normal">{count}</span>
      </h2>
      <ul className="border-t border-border">{children}</ul>
    </section>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: ReactNode }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={href}
        className="flex items-baseline justify-between gap-4 py-2.5 no-underline hover:bg-raised"
      >
        <span className="min-w-0 truncate text-[13px] text-primary">{title}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted">{meta}</span>
      </Link>
    </li>
  );
}

export function SearchView() {
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const debounced = useDebounced(term);
  const search = useSearch(debounced);

  const trimmed = debounced.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH;
  const results = search.data;

  const nothingFound = useMemo(
    () => results !== undefined && results.counts.total === 0,
    [results],
  );

  return (
    <>
      <PageHeader title="Search" description="Across your tasks, events and spaces." />

      <div className="relative">
        <SearchIcon
          size={15}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search tasks, events and spaces"
          aria-label="Search"
          autoComplete="off"
          autoFocus
          className="pl-9"
        />
      </div>

      <div className="mt-8">
        {tooShort ? (
          <p className="text-[13px] text-muted">
            Keep typing. Search needs at least {MIN_SEARCH_LENGTH} characters.
          </p>
        ) : null}

        {trimmed.length === 0 ? (
          <p className="text-[13px] text-secondary">
            Type to search. Results cover your tasks, your calendar and your spaces.
          </p>
        ) : null}

        {search.isFetching ? (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Spinner size={13} label="Searching" />
            Searching
          </p>
        ) : null}

        {search.isError ? (
          <ErrorNotice
            title="That search could not be run."
            onRetry={() => void search.refetch()}
          />
        ) : null}

        {nothingFound && !search.isFetching ? (
          <EmptyState
            title={`Nothing matches "${trimmed}".`}
            description="Search looks at titles and descriptions. Try a shorter or more distinctive word."
          />
        ) : null}

        {results && results.counts.total > 0 ? (
          <>
            <Group
              icon={<SquareCheck size={13} aria-hidden />}
              label="Tasks"
              count={results.counts.tasks}
            >
              {results.tasks.map((task: Task) => {
                const due = describeDue(task.dueAt);
                return (
                  <Row
                    key={task.id}
                    href="/tasks"
                    title={task.title}
                    meta={
                      <>
                        {due ? <Badge tone={due.tone}>{due.label}</Badge> : null}
                        <span>{task.status.replace(/_/g, ' ')}</span>
                      </>
                    }
                  />
                );
              })}
            </Group>

            <Group
              icon={<Calendar size={13} aria-hidden />}
              label="Events"
              count={results.counts.events}
            >
              {results.events.map((event: Event) => (
                <Row
                  key={event.id}
                  href="/calendar"
                  title={event.title}
                  meta={
                    <span className="font-mono tabular-nums">
                      {formatDay(new Date(event.startsAt))}
                      {event.allDay ? '' : ` ${formatTime(event.startsAt)}`}
                    </span>
                  }
                />
              ))}
            </Group>

            <Group
              icon={<LayoutGrid size={13} aria-hidden />}
              label="Spaces"
              count={results.counts.spaces}
            >
              {results.spaces.map((space: Space) => (
                <Row
                  key={space.id}
                  href="/spaces"
                  title={space.name}
                  meta={<span>{space.description ?? ''}</span>}
                />
              ))}
            </Group>

            <p className="text-xs text-muted">
              Matching is on titles and descriptions, and at most 10 of each kind are shown.
            </p>
          </>
        ) : null}
      </div>
    </>
  );
}
