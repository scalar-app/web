import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CalendarView } from './CalendarView';

const range = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: { timeline: { range: (q: unknown) => range(q) as unknown } },
}));

function block(over: Record<string, unknown> = {}) {
  return {
    id: 'task:t1',
    itemId: 't1',
    blockType: 'task' as const,
    title: 'Finish problem set',
    startAt: '2026-08-19T09:00:00.000Z',
    endAt: '2026-08-19T10:30:00.000Z',
    allDay: false,
    locked: false,
    source: 'manual' as const,
    status: 'todo',
    priority: null,
    spaceId: null,
    projectId: null,
    location: null,
    ...over,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('CalendarView', () => {
  beforeEach(() => {
    range.mockReset();
  });

  it('asks for the whole week in one request', async () => {
    range.mockResolvedValue({ timeZone: 'UTC', days: [] });
    render(<CalendarView />, { wrapper });

    await screen.findByText('Calendar');
    const query = range.mock.calls[0]?.[0] as { from: string; to: string };
    expect(query.from < query.to).toBe(true);
  });

  it('shows planned work, not only events from a calendar', async () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    range.mockResolvedValue({
      timeZone: 'UTC',
      days: [{ date: key, blocks: [block()], busyMinutes: 90, conflicts: [] }],
    });
    render(<CalendarView />, { wrapper });

    // The defect this replaced: a week of "Free" beside hours of scheduled work.
    expect(await screen.findByText('Finish problem set')).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min')).toBeInTheDocument();
  });

  it('still says a genuinely empty day is free', async () => {
    range.mockResolvedValue({ timeZone: 'UTC', days: [] });
    render(<CalendarView />, { wrapper });

    expect((await screen.findAllByText('Free')).length).toBe(7);
  });

  it('offers a retry when the week cannot be loaded', async () => {
    range.mockRejectedValue(new Error('offline'));
    render(<CalendarView />, { wrapper });

    expect(await screen.findByText('Calendar could not be loaded.')).toBeInTheDocument();
  });
});
