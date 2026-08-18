'use client';

import type { Event } from '@scalar/sdk';
import { Button, Spinner } from '@scalar/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { useEvents } from '@/lib/queries/events';
import { addDays, formatDay, formatTime, startOfWeek, toDateKey } from '@/lib/time';

function groupByDay(events: Event[], days: Date[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>(days.map((d) => [toDateKey(d), []]));
  for (const event of events) {
    map.get(toDateKey(new Date(event.startsAt)))?.push(event);
  }
  return map;
}

export function CalendarView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const events = useEvents(weekStart, weekEnd);
  const todayKey = toDateKey(new Date());
  const byDay = events.data ? groupByDay(events.data.data, days) : null;

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
      {events.isPending ? (
        <div className="py-10 text-center" aria-busy="true">
          <Spinner size={14} />
        </div>
      ) : events.isError ? (
        <ErrorNotice title="Calendar could not be loaded." onRetry={() => void events.refetch()} />
      ) : (
        <ol className="flex flex-col">
          {days.map((day) => {
            const key = toDateKey(day);
            const items = byDay?.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <li
                key={key}
                className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border py-3 last:border-b-0"
              >
                <div className={`text-[13px] ${isToday ? 'text-yellow' : 'text-secondary'}`}>
                  {formatDay(day)}
                </div>
                {items.length === 0 ? (
                  <p className="text-[13px] text-muted">Free</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {items.map((event) => (
                      <li
                        key={event.id}
                        className="flex items-baseline justify-between gap-4 text-[13px]"
                      >
                        <span className="truncate text-primary">{event.title}</span>
                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-secondary">
                          {event.allDay
                            ? 'All day'
                            : `${formatTime(event.startsAt)} to ${formatTime(event.endsAt)}`}
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
        External calendars are not connected yet. Events appear here once the Google Calendar
        integration lands.
      </p>
    </>
  );
}
