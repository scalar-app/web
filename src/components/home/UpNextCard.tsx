'use client';

import type { UpNext } from '@scalar/sdk';
import { Button } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { useStartFocus } from '@/lib/queries/focus';
import { formatTime } from '@/lib/time';

/**
 * The answer to the only question Home really has to answer.
 *
 * One thing, in large type, with why it is the answer and the single action that follows from it.
 * Not a list, not a dashboard: if a person reads nothing else on this screen, this is the part
 * that has to be worth having read.
 */

const REASON_TEXT: Record<UpNext['reason'], string> = {
  focus_in_progress: 'You are focusing on this now',
  happening_now: 'Happening now',
  next_scheduled: 'The next thing you planned',
  next_event: 'Your next event',
  most_urgent_unscheduled: 'The most pressing thing without a time',
  nothing_to_do: 'Nothing is scheduled and nothing is waiting',
};

function whenText(upNext: UpNext): string | null {
  if (upNext.kind === 'focus') return 'In progress';
  if (!upNext.startAt) {
    return upNext.estimatedMinutes !== null ? `About ${upNext.estimatedMinutes} min` : null;
  }
  const start = formatTime(upNext.startAt);
  return upNext.endAt ? `${start} to ${formatTime(upNext.endAt)}` : start;
}

export function UpNextCard({ upNext }: { upNext: UpNext }) {
  const router = useRouter();
  const startFocus = useStartFocus();

  if (upNext.kind === 'nothing') {
    return (
      <section aria-labelledby="up-next-heading" className="mb-10">
        <h2
          id="up-next-heading"
          className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
        >
          Up next
        </h2>
        <p className="text-[15px] text-secondary">{REASON_TEXT.nothing_to_do}.</p>
      </section>
    );
  }

  const when = whenText(upNext);
  const canFocus = upNext.taskId !== null && upNext.kind !== 'focus';

  return (
    <section aria-labelledby="up-next-heading" className="mb-10">
      <h2
        id="up-next-heading"
        className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
      >
        Up next
      </h2>
      <p className="text-lg font-medium tracking-tight text-primary">{upNext.title}</p>
      <p className="mt-1 text-[13px] text-secondary">
        {REASON_TEXT[upNext.reason]}
        {when ? ` · ${when}` : ''}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {upNext.kind === 'focus' ? (
          <Button
            size="sm"
            onClick={() => {
              router.push('/focus');
            }}
          >
            Back to focus
          </Button>
        ) : null}
        {canFocus ? (
          <Button
            size="sm"
            loading={startFocus.isPending}
            onClick={() => {
              const taskId = upNext.taskId;
              if (!taskId) return;
              startFocus.mutate(
                { taskId },
                {
                  onSuccess: () => {
                    router.push('/focus');
                  },
                },
              );
            }}
          >
            Start focus
          </Button>
        ) : null}
      </div>
      {startFocus.isError ? (
        <p className="mt-2 text-[12px] text-muted" role="alert">
          That could not be started right now.
        </p>
      ) : null}
    </section>
  );
}
