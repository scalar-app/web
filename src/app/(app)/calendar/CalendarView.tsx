'use client';

import type { TimelineBlock } from '@scalar/sdk';
import { Button, Spinner } from '@scalar/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { useTimelineRange } from '@/lib/queries/timeline';
import { addDays, formatDay, formatTime, startOfWeek, toDateKey } from '@/lib/time';

/**
 * The week as it actually is.
 *
 * Reads the timeline rather than the calendar, so work someone has planned counts as time that is
 * spoken for. A week of "Free" beside four hours of scheduled work was worse than showing nothing.
 */
function describeBlock(block: TimelineBlock): string {
  if (block.allDay) return 'All day';
  return `${formatTime(block.startAt)} to ${formatTime(block.endAt)}`;
}

export function CalendarView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const timeline = useTimelineRange(toDateKey(weekStart), toDateKey(addDays(weekStart, 6)));
  const todayKey = toDateKey(new Date());
  const byDay = new Map((timeline.data?.days ?? []).map((day) => [day.date, day]));

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${formatDay(weekStart)} to ${formatDay(addDays(weekStart, 6))}`}
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              aria-label="Previous week"
            >
              <ChevronLeft size={14} aria-hidden />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              This week
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label="Next week"
            >
              <ChevronRight size={14} aria-hidden />
            </Button>
          </>
        }
      />
      {timeline.isPending ? (
        <div className="py-10 text-center" aria-busy="true">
          <Spinner size={14} />
        </div>
      ) : timeline.isError ? (
        <ErrorNotice
          title="Calendar could not be loaded."
          onRetry={() => void timeline.refetch()}
        />
      ) : (
        <ol className="flex flex-col">
          {days.map((day) => {
            const key = toDateKey(day);
            const entry = byDay.get(key);
            const items = entry?.blocks ?? [];
            const isToday = key === todayKey;
            const busy = entry?.busyMinutes ?? 0;
            return (
              <li
                key={key}
                className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border py-3 last:border-b-0"
              >
                <div className={`text-[13px] ${isToday ? 'text-yellow' : 'text-secondary'}`}>
                  {formatDay(day)}
                  {busy > 0 ? (
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {busy >= 60
                        ? `${String(Math.floor(busy / 60))} hr${busy % 60 ? ` ${String(busy % 60)} min` : ''}`
                        : `${String(busy)} min`}
                    </span>
                  ) : null}
                </div>
                {items.length === 0 ? (
                  <p className="text-[13px] text-muted">Free</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {items.map((block) => (
                      <li
                        key={block.id}
                        className="flex items-baseline justify-between gap-4 text-[13px]"
                      >
                        <span className="flex min-w-0 items-baseline gap-2">
                          {/* Hollow for work you planned, solid for something you were invited
                              to: the same mark the timeline uses on Home. */}
                          <span
                            aria-hidden
                            className={
                              block.blockType === 'task'
                                ? 'size-1.5 shrink-0 rounded-full border border-secondary'
                                : 'size-1.5 shrink-0 rounded-full bg-secondary'
                            }
                          />
                          <span className="truncate text-primary">{block.title}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-secondary">
                          {describeBlock(block)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-6 text-[12px] text-muted">
        Hollow marks are work you planned; solid ones are events from a connected calendar. Add one
        in{' '}
        <Link
          href="/settings/integrations"
          className="text-secondary underline-offset-2 hover:text-primary"
        >
          Settings, Integrations
        </Link>
        .
      </p>
    </>
  );
}
