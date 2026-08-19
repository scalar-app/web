'use client';

import type { CompleteFocusResult, FocusSession, Task } from '@scalar/sdk';
import { Button, EmptyState, Spinner, Textarea } from '@scalar/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { useImmersive } from '@/components/shell/immersive';
import {
  useCancelFocus,
  useCompleteFocus,
  useCurrentFocus,
  useStartFocus,
} from '@/lib/queries/focus';
import { useTasks } from '@/lib/queries/tasks';

/**
 * Focus reduces the system to one thing.
 *
 * While a session runs this screen shows the task, the time, and somewhere to write. No lists, no
 * counts, no other work, and no navigation either: the shell is asked to get out of the way, or
 * this would only be a different middle of the same page. The timer counts up rather than down, so
 * running over is information rather than failure.
 */

function elapsedSeconds(startedAt: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(rest).padStart(2, '0');
  return hours > 0 ? `${String(hours)}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ActiveSession({ session }: { session: FocusSession }) {
  const complete = useCompleteFocus();
  const cancel = useCancelFocus();
  const [notes, setNotes] = useState(session.notes ?? '');
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState<CompleteFocusResult | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const seconds = elapsedSeconds(session.startedAt, now);
  const planned = session.plannedMinutes;
  const over = planned !== null && seconds > planned * 60;
  const busy = complete.isPending || cancel.isPending;

  async function end(completeTask: boolean): Promise<void> {
    try {
      setFinished(
        await complete.mutateAsync({
          id: session.id,
          notes: notes.trim().length > 0 ? notes : null,
          ...(completeTask ? { completeTask: true } : {}),
        }),
      );
    } catch {
      /* shown through complete.isError */
    }
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16 text-center">
        <p className="text-[13px] text-secondary">
          {finished.taskCompleted ? 'Finished' : 'Session ended'}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">
          {finished.session.actualMinutes ?? 0} min on {finished.session.taskTitle}
        </p>
        {finished.estimateUpdated ? (
          <p className="mt-4 text-[13px] text-secondary">
            This had no estimate, so Scalar recorded {finished.session.actualMinutes ?? 0} minutes
            as one. You can change it on the task.
          </p>
        ) : null}
        {finished.typicalMinutes !== null ? (
          <p className="mt-2 text-[13px] text-muted">
            Typically {finished.typicalMinutes} minutes.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-primary">{session.taskTitle}</h1>
      {planned !== null ? (
        <p className="mt-1 text-[13px] text-secondary">Planned {planned} min</p>
      ) : null}

      <p
        className={`mt-10 font-mono text-5xl tabular-nums ${over ? 'text-warning' : 'text-primary'}`}
        role="timer"
        aria-live="off"
      >
        {formatElapsed(seconds)}
      </p>
      {over ? <p className="mt-2 text-[12px] text-muted">Past the time you planned.</p> : null}

      <div className="mt-10 w-full text-left">
        <label className="text-[13px] text-secondary" htmlFor="focus-notes">
          Notes
        </label>
        <Textarea
          id="focus-notes"
          className="mt-1.5 w-full"
          rows={3}
          value={notes}
          placeholder="Anything worth keeping."
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />
      </div>

      {complete.isError || cancel.isError ? (
        <div className="mt-4 w-full">
          <ErrorNotice title="That session could not be ended. It is still running." />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" loading={complete.isPending} onClick={() => void end(true)}>
          Complete task
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void end(false)}>
          End session
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            cancel.mutate(session.id);
          }}
        >
          Discard
        </Button>
      </div>
      <p className="mt-3 text-[12px] text-muted">Discard ends this without recording the time.</p>

      {/* A way out that is not a decision about the work: the session keeps running, and Home
          offers its way back. Quiet, because leaving should not be the obvious thing to do. */}
      <Link
        href="/today"
        className="mt-10 text-[12px] text-muted underline-offset-4 hover:text-secondary hover:underline"
      >
        Leave this open and go back
      </Link>
    </div>
  );
}

function StartPicker() {
  const start = useStartFocus();
  const tasks = useTasks({ status: ['todo', 'in_progress'], limit: 20 });

  if (tasks.isPending) {
    return (
      <div className="py-10 text-center" aria-busy="true">
        <Spinner size={14} />
      </div>
    );
  }
  if (tasks.isError) {
    return (
      <ErrorNotice title="Your tasks could not be loaded." onRetry={() => void tasks.refetch()} />
    );
  }

  const open = tasks.data.data;
  if (open.length === 0) {
    return (
      <EmptyState
        title="Nothing to focus on."
        description="Add a task, or plan your day from Today, and it will show up here."
      />
    );
  }

  return (
    <>
      <p className="mb-4 text-[13px] text-secondary">Pick one thing.</p>
      {start.isError ? (
        <div className="mb-4">
          <ErrorNotice title="That session could not be started." />
        </div>
      ) : null}
      <ul className="flex flex-col">
        {open.map((task: Task) => (
          <li
            key={task.id}
            className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-primary">{task.title}</span>
            {task.estimatedMinutes !== null ? (
              <span className="shrink-0 text-[12px] text-muted">{task.estimatedMinutes} min</span>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              disabled={start.isPending}
              onClick={() => {
                start.mutate({ taskId: task.id });
              }}
            >
              Start
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function FocusView() {
  const current = useCurrentFocus();
  // A running session takes the whole screen. Choosing what to work on keeps the navigation.
  useImmersive(current.isSuccess && current.data !== null);

  if (current.isPending) {
    return (
      <div className="py-10 text-center" aria-busy="true">
        <Spinner size={14} />
      </div>
    );
  }
  if (current.isError) {
    return (
      <ErrorNotice title="Focus could not be loaded." onRetry={() => void current.refetch()} />
    );
  }

  // No header while a session runs: the screen is the task and nothing else.
  if (current.data) return <ActiveSession session={current.data} />;

  return (
    <>
      <PageHeader title="Focus" />
      <StartPicker />
    </>
  );
}
