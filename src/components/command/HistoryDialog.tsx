'use client';

import { Dialog, EmptyState, Spinner } from '@scalar/ui';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useCommandThreads } from '@/lib/queries/command';
import { addDays, formatDay, formatTime, startOfLocalDay } from '@/lib/time';

/**
 * Past Ask conversations. Threads are stored per person, so this only ever lists your own.
 *
 * A dialog rather than a side rail: it reads the same on a phone and a desktop, and history is
 * something you reach for occasionally rather than something worth spending permanent width on.
 */

function whenLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const today = startOfLocalDay(now);
  const yesterday = addDays(today, -1);
  if (at >= today) return formatTime(iso);
  if (at >= yesterday) return 'Yesterday';
  return formatDay(at);
}

export interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (threadId: string) => void;
  /** Highlighted as current, so it is clear which one you are already reading. */
  activeThreadId: string | null;
}

export function HistoryDialog({ open, onClose, onSelect, activeThreadId }: HistoryDialogProps) {
  const threads = useCommandThreads(open);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="Past conversations"
      description="Everything you have asked Scalar, most recent first."
    >
      {threads.isPending ? (
        <div className="flex justify-center py-8">
          <Spinner size={16} label="Loading conversations" />
        </div>
      ) : null}

      {threads.isError ? (
        <ErrorNotice
          title="Your conversations could not be loaded."
          onRetry={() => void threads.refetch()}
        />
      ) : null}

      {threads.data && threads.data.data.length === 0 ? (
        <EmptyState
          title="Nothing here yet."
          description="Conversations show up once you have asked Scalar something."
        />
      ) : null}

      {threads.data && threads.data.data.length > 0 ? (
        <ul className="flex max-h-[60vh] flex-col overflow-y-auto">
          {threads.data.data.map((thread) => {
            const current = thread.id === activeThreadId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(thread.id);
                    onClose();
                  }}
                  aria-current={current ? 'true' : undefined}
                  className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-[13px] hover:bg-raised ${
                    current ? 'bg-raised text-primary' : 'text-secondary'
                  }`}
                >
                  <span className="truncate">{thread.title}</span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
                    {whenLabel(thread.lastMessageAt)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Dialog>
  );
}
