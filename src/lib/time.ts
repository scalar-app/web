export function localTimeZone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday-first start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfLocalDay(date);
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const longDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatDay(date: Date): string {
  return dayFormatter.format(date);
}

export function formatLongDay(date: Date): string {
  return longDayFormatter.format(date);
}

/** Human relative due phrase used in lists: Overdue, Today, Tomorrow, or a short date. */
export function describeDue(
  iso: string | null,
  now: Date = new Date(),
): { label: string; tone: 'danger' | 'yellow' | 'neutral' } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const today = startOfLocalDay(now);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);
  if (due < now) return { label: 'Overdue', tone: 'danger' };
  if (due < tomorrow) return { label: `Today ${formatTime(iso)}`, tone: 'yellow' };
  if (due < dayAfter) return { label: `Tomorrow ${formatTime(iso)}`, tone: 'neutral' };
  return { label: formatDay(due), tone: 'neutral' };
}

/**
 * When something happened, in the words a person would use.
 *
 * Relative for the last day, because "4 hours ago" is what somebody wants to know about a
 * notification, and absolute after that, because "73 hours ago" is arithmetic homework. The
 * boundary is a day rather than a week: past that, the date is the more useful fact.
 */
export function describeWhen(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const seconds = Math.round((now.getTime() - at.getTime()) / 1000);
  // A clock that is a little behind the server should not produce "in 3 seconds".
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} hour${hours === 1 ? '' : 's'} ago`;
  return `${formatDay(at)} ${formatTime(iso)}`;
}
