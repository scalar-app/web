'use client';

import type { Event, Task } from '@scalar/sdk';
import { EmptyState, Spinner } from '@scalar/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { TaskList } from '@/components/tasks/TaskList';
import { useToday } from '@/lib/queries/today';
import { formatLongDay, formatTime } from '@/lib/time';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      <div className="border-t border-border" />
      {children}
    </section>
  );
}

function EventRow({ event }: { event: Event }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-[13px] last:border-b-0">
      <span className="truncate text-primary">{event.title}</span>
      <span className="shrink-0 font-mono text-[12px] tabular-nums text-secondary">
        {event.allDay ? 'All day' : `${formatTime(event.startsAt)}`}
      </span>
    </li>
  );
}

function attentionSentence(count: number): string {
  if (count === 0) return 'Nothing needs your attention right now.';
  if (count === 1) return '1 thing needs your attention.';
  return `${count} things need your attention.`;
}

function dedupe(...groups: Task[][]): Task[] {
  const seen = new Set<string>();
  const out: Task[] = [];
  for (const group of groups) {
    for (const task of group) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      out.push(task);
    }
  }
  return out;
}

export function TodayView() {
  const today = useToday();

  if (today.isPending) {
    return (
      <div className="py-10 text-center" aria-busy="true">
        <Spinner size={14} />
      </div>
    );
  }
  if (today.isError) {
    return <ErrorNotice title="Today could not be loaded." onRetry={() => void today.refetch()} />;
  }

  const data = today.data;
  const attention = dedupe(data.overdue, data.urgent, data.dueToday);
  const now = new Date();

  return (
    <>
      <header className="mb-10">
        <p className="text-xl font-semibold tracking-tight">{data.greeting}</p>
        <p className="mt-1 text-[13px] text-secondary">{formatLongDay(now)}</p>
        <p className="mt-4 text-[13px] text-primary">{attentionSentence(data.attentionCount)}</p>
      </header>

      {attention.length > 0 ? (
        <Section title="Needs attention">
          <TaskList tasks={attention} />
        </Section>
      ) : null}

      <Section title="Upcoming">
        {data.upcoming.length === 0 ? (
          <p className="py-3 text-[13px] text-muted">
            No events today.{' '}
            <Link
              href="/settings/integrations"
              className="text-secondary underline-offset-2 hover:text-primary"
            >
              Connect a calendar
            </Link>{' '}
            to see them here.
          </p>
        ) : (
          <ul className="flex flex-col">
            {data.upcoming.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </Section>

      {attention.length === 0 && data.upcoming.length === 0 ? (
        <EmptyState
          title="A clear day."
          description="Scalar will surface deadlines, events and updates that need you as they arrive."
        />
      ) : null}
    </>
  );
}
