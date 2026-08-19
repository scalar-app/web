'use client';

import type { Timeline as TimelineData, TimelineBlock } from '@scalar/sdk';
import { EmptyState } from '@scalar/ui';
import { formatTime } from '@/lib/time';

/**
 * The day as one column.
 *
 * A lecture and an hour of work on an assignment are different rows in the database and the same
 * thing to a person at nine in the morning, so they are drawn the same way: a time, a title, and
 * whatever small mark distinguishes them. Nothing here decides what should happen, it shows what
 * already does.
 */

function durationLabel(block: TimelineBlock): string | null {
  if (block.allDay) return null;
  const minutes = Math.round(
    (new Date(block.endAt).getTime() - new Date(block.startAt).getTime()) / 60_000,
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

function isNow(block: TimelineBlock, now: Date): boolean {
  if (block.allDay) return false;
  const time = now.getTime();
  return new Date(block.startAt).getTime() <= time && time < new Date(block.endAt).getTime();
}

function BlockRow({
  block,
  conflicted,
  now,
}: {
  block: TimelineBlock;
  conflicted: boolean;
  now: Date;
}) {
  const duration = durationLabel(block);
  const current = isNow(block, now);

  return (
    <li
      className="flex gap-4 border-b border-border py-2.5 text-[13px] last:border-b-0"
      aria-current={current ? 'time' : undefined}
    >
      <span className="w-16 shrink-0 pt-px font-mono text-[12px] tabular-nums text-secondary">
        {block.allDay ? 'All day' : formatTime(block.startAt)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          {/* A task block is work Scalar may still move; an event is not. One mark, not a badge. */}
          <span
            aria-hidden
            className={
              block.blockType === 'task'
                ? 'mt-1.5 size-1.5 shrink-0 rounded-full border border-secondary'
                : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-secondary'
            }
          />
          <span className="truncate text-primary">{block.title}</span>
        </span>
        {duration || block.location || conflicted ? (
          <span className="mt-0.5 block pl-3.5 text-[12px] text-muted">
            {[duration, block.location, conflicted ? 'Overlaps another block' : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        ) : null}
      </span>
      {current ? (
        <span className="shrink-0 self-start text-[11px] uppercase tracking-[0.12em] text-secondary">
          Now
        </span>
      ) : null}
    </li>
  );
}

export function Timeline({ data, now = new Date() }: { data: TimelineData; now?: Date }) {
  if (data.blocks.length === 0) {
    return (
      <EmptyState
        title="Nothing scheduled."
        description="Events from a connected calendar and tasks you have given a time will appear here."
      />
    );
  }

  const conflicted = new Set(data.conflicts.flatMap((conflict) => conflict.blockIds));

  return (
    <ul className="flex flex-col">
      {data.blocks.map((block) => (
        <BlockRow key={block.id} block={block} conflicted={conflicted.has(block.id)} now={now} />
      ))}
    </ul>
  );
}
