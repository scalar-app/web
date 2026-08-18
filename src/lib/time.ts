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
