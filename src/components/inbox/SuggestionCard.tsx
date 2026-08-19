'use client';

import type { InboxItem, Space, SuggestionValues } from '@scalar/sdk';
import { Button, Input, Select } from '@scalar/ui';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useAcceptSuggestion, useDismissSuggestion } from '@/lib/queries/inbox';
import { formatDay, formatTime } from '@/lib/time';

/**
 * What Scalar thinks an inbox item is, offered rather than applied.
 *
 * Three ways out and no default: accept it, change it and then accept it, or turn the advice down
 * and leave the item where it is. Nothing has happened when this appears, and the reason the
 * suggestion exists is on screen next to it, so a person can disagree with the reasoning rather
 * than just the result.
 */

function describeSchedule(values: SuggestionValues): string | null {
  if (!values.scheduledStart) return null;
  const start = new Date(values.scheduledStart);
  const time = values.scheduledEnd
    ? `${formatTime(values.scheduledStart)} to ${formatTime(values.scheduledEnd)}`
    : formatTime(values.scheduledStart);
  return `${formatDay(start)}, ${time}`;
}

export function SuggestionCard({ item, spaces }: { item: InboxItem; spaces: Space[] }) {
  const accept = useAcceptSuggestion();
  const dismiss = useDismissSuggestion();
  const suggested = item.suggestion?.values ?? {};

  const [spaceId, setSpaceId] = useState<string>(suggested.spaceId ?? item.task.spaceId ?? '');
  const [minutes, setMinutes] = useState<string>(
    String(suggested.estimatedMinutes ?? item.task.estimatedMinutes ?? ''),
  );
  const [keepSchedule, setKeepSchedule] = useState(true);

  const busy = accept.isPending || dismiss.isPending;
  const schedule = describeSchedule(suggested);

  function onAccept(): void {
    const values: SuggestionValues = {
      ...(spaceId ? { spaceId } : {}),
      ...(minutes.trim() !== '' ? { estimatedMinutes: Number(minutes) } : {}),
      ...(keepSchedule && suggested.scheduledStart && suggested.scheduledEnd
        ? {
            scheduledStart: suggested.scheduledStart,
            scheduledEnd: suggested.scheduledEnd,
          }
        : {}),
      ...(suggested.priority ? { priority: suggested.priority } : {}),
      ...(suggested.dueAt !== undefined ? { dueAt: suggested.dueAt } : {}),
    };
    accept.mutate({
      taskId: item.task.id,
      values,
      ...(item.suggestion?.id ? { suggestionId: item.suggestion.id } : {}),
    });
  }

  return (
    <div className="mt-3 rounded-md border border-border px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
        {item.suggestion?.origin === 'integration'
          ? `Suggested by ${item.suggestion.source}`
          : 'Suggested'}
      </p>
      {item.suggestion?.reason ? (
        <p className="mt-1 text-[12px] text-secondary">{item.suggestion.reason}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {spaces.length > 0 ? (
          <label className="grid gap-1">
            <span className="text-[12px] text-secondary">Space</span>
            <Select
              value={spaceId}
              aria-label={`Space for "${item.task.title}"`}
              onChange={(event) => {
                setSpaceId(event.target.value);
              }}
              className="w-40"
            >
              <option value="">None</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-[12px] text-secondary">Minutes</span>
          <Input
            type="number"
            size="sm"
            min={1}
            step={5}
            className="w-24"
            value={minutes}
            aria-label={`Estimated minutes for "${item.task.title}"`}
            onChange={(event) => {
              setMinutes(event.target.value);
            }}
          />
        </label>

        {schedule ? (
          <label className="flex items-center gap-2 pb-1.5 text-[12px] text-secondary">
            <input
              type="checkbox"
              checked={keepSchedule}
              onChange={(event) => {
                setKeepSchedule(event.target.checked);
              }}
              aria-label={`Schedule "${item.task.title}" ${schedule}`}
            />
            {schedule}
          </label>
        ) : null}
      </div>

      {accept.isError || dismiss.isError ? (
        <div className="mt-3">
          <ErrorNotice title="That could not be saved. The item is still in your inbox." />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" loading={accept.isPending} disabled={busy} onClick={onAccept}>
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            dismiss.mutate({
              taskId: item.task.id,
              ...(item.suggestion?.id ? { suggestionId: item.suggestion.id } : {}),
            });
          }}
        >
          Not this
        </Button>
      </div>
    </div>
  );
}
