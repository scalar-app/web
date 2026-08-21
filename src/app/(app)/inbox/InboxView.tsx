'use client';

import type { InboxItem, Space } from '@scalar/sdk';
import { Badge, Button, EmptyState, Select, Spinner } from '@scalar/ui';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { SuggestionCard } from '@/components/inbox/SuggestionCard';
import { useInbox } from '@/lib/queries/inbox';
import { useSpaces } from '@/lib/queries/spaces';
import { useUpdateTask } from '@/lib/queries/tasks';
import { describeDue } from '@/lib/time';

/**
 * Triage.
 *
 * Everything captured without being filed lands with the `inbox` status, and this is where it
 * gets decided: keep it, put it somewhere, or drop it. The point of the screen is to end up
 * empty, so each row offers the smallest set of decisions that clears it.
 *
 * There is no separate inbox table. An unfiled task is a task, and giving it one would mean two
 * places to look for the same thing. What a row can carry is a suggestion about where the item
 * belongs, which is advice until someone accepts it.
 */
function InboxRow({ item, spaces }: { item: InboxItem; spaces: Space[] }) {
  const task = item.task;
  const update = useUpdateTask();
  const due = describeDue(task.dueAt);

  function keep() {
    update.mutate({ id: task.id, input: { status: 'todo' } });
  }

  function dismiss() {
    update.mutate({ id: task.id, input: { status: 'cancelled' } });
  }

  function fileInto(spaceId: string) {
    update.mutate({
      id: task.id,
      input: { status: 'todo', spaceId: spaceId === '' ? null : spaceId },
    });
  }

  return (
    <li className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-primary">{task.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {due ? <Badge tone={due.tone}>{due.label}</Badge> : null}
            {task.description ? (
              <span className="line-clamp-1 text-xs text-muted">{task.description}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {spaces.length > 0 ? (
            <Select
              aria-label={`Move "${task.title}" into a space`}
              defaultValue=""
              disabled={update.isPending}
              onChange={(event) => fileInto(event.target.value)}
              className="min-h-11 w-36 md:min-h-0"
            >
              <option value="" disabled>
                Move to space
              </option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </Select>
          ) : null}

          <Button
            size="sm"
            variant="primary"
            onClick={keep}
            loading={update.isPending}
            iconStart={<Check size={14} aria-hidden />}
            aria-label={`Keep "${task.title}" and move it to your tasks`}
            className="min-h-11 md:min-h-0"
          >
            Keep
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={dismiss}
            disabled={update.isPending}
            iconStart={<X size={14} aria-hidden />}
            aria-label={`Dismiss "${task.title}"`}
            className="min-h-11 md:min-h-0"
          >
            Dismiss
          </Button>
        </div>
      </div>
      {/* Keeping, filing and dismissing are all optimistic, so a failure looks like the row
          clearing and then coming back. Say why rather than letting it read as a glitch. */}
      {update.isError ? (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          Could not file that. Try again.
        </p>
      ) : null}
      {item.suggestion ? <SuggestionCard item={item} spaces={spaces} /> : null}
    </li>
  );
}

export function InboxView() {
  const inbox = useInbox();
  const spacesQuery = useSpaces();
  const [showDone, setShowDone] = useState(false);

  const items = inbox.data?.data ?? [];
  const spaces = (spacesQuery.data?.data ?? []).filter((space) => space.archivedAt === null);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Anything captured but not yet filed. Clear it by keeping, filing or dismissing."
        actions={
          items.length > 0 ? (
            <span className="text-[13px] text-secondary">{items.length} to triage</span>
          ) : null
        }
      />

      {inbox.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner size={16} label="Loading your inbox" />
        </div>
      ) : null}

      {inbox.isError ? (
        <ErrorNotice title="Your inbox could not be loaded." onRetry={() => void inbox.refetch()} />
      ) : null}

      {inbox.isSuccess && items.length === 0 ? (
        <EmptyState
          title="Inbox zero."
          description="Nothing is waiting to be filed. New items arrive here when you capture something without saying where it goes, and from connected services as those land."
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="border-t border-border">
          {items.map((item) => (
            <InboxRow key={item.task.id} item={item} spaces={spaces} />
          ))}
        </ul>
      ) : null}

      {inbox.isSuccess && items.length === 0 && !showDone ? (
        <p className="mt-6 text-xs text-muted">
          <button
            type="button"
            onClick={() => setShowDone(true)}
            className="underline decoration-border underline-offset-4 hover:decoration-yellow"
          >
            Where do inbox items come from?
          </button>
        </p>
      ) : null}

      {showDone ? (
        <p className="mt-6 max-w-xl text-xs text-muted">
          Anything created without a space or a status starts here: quick capture from Command, and,
          once the Gmail and Canvas integrations land, messages and assignments that need a
          decision. Keeping an item moves it to your tasks; dismissing it marks it cancelled rather
          than deleting it, so nothing is lost. Where Scalar has something to suggest about an item,
          it appears under the row as a proposal, and nothing is applied until you accept it.
        </p>
      ) : null}
    </>
  );
}
