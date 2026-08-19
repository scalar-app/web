import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TodayView } from './TodayView';

const getHome = vi.fn();
const getTimeline = vi.fn();
const previewPlan = vi.fn();

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

vi.mock('@/lib/api', () => ({
  scalar: {
    home: { get: (q: unknown) => getHome(q) as unknown },
    focus: { start: () => Promise.resolve({}) },
    timeline: { get: (q: unknown) => getTimeline(q) as unknown },
    tasks: { update: () => Promise.resolve() },
    planner: { preview: (input: unknown) => previewPlan(input) as unknown },
  },
}));

const quietHome = {
  date: '2026-08-19',
  greeting: 'Good morning.',
  timeZone: 'UTC',
  busyMinutes: 60,
  upNext: {
    kind: 'task' as const,
    itemId: '33333333-3333-4333-8333-333333333333',
    taskId: '33333333-3333-4333-8333-333333333333',
    title: 'Reply to the professor',
    startAt: null,
    endAt: null,
    estimatedMinutes: 15,
    reason: 'most_urgent_unscheduled' as const,
  },
  attention: [],
};

const timeline = {
  date: '2026-08-19',
  timeZone: 'UTC',
  busyMinutes: 60,
  conflicts: [],
  blocks: [
    {
      id: 'event:e1',
      itemId: 'e1',
      blockType: 'event' as const,
      title: 'Calculus lecture',
      startAt: '2026-08-19T09:00:00.000Z',
      endAt: '2026-08-19T10:00:00.000Z',
      allDay: false,
      locked: true,
      source: 'integration' as const,
      status: null,
      priority: null,
      spaceId: null,
      projectId: null,
      location: null,
    },
  ],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('TodayView', () => {
  beforeEach(() => {
    getHome.mockReset();
    getTimeline.mockReset();
    previewPlan.mockReset();
    getHome.mockResolvedValue(quietHome);
    getTimeline.mockResolvedValue(timeline);
    previewPlan.mockResolvedValue({
      rangeStart: '2026-08-19T08:00:00.000Z',
      rangeEnd: '2026-08-26T08:00:00.000Z',
      timeZone: 'UTC',
      blocks: [
        {
          taskId: '11111111-1111-4111-8111-111111111111',
          title: 'Finish problem set',
          startAt: '2026-08-19T13:00:00.000Z',
          endAt: '2026-08-19T14:00:00.000Z',
          minutes: 60,
          reasons: ['fits_available_window'],
        },
      ],
      unscheduled: [],
      conflicts: [],
      warnings: [],
    });
  });

  it('asks before it changes the day', async () => {
    render(<TodayView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Plan my day' }));

    expect(await screen.findByText('Proposed plan')).toBeInTheDocument();
    expect(screen.getByText(/Nothing has changed yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply plan' })).toBeInTheDocument();
  });

  it('puts the plan away when it is cancelled', async () => {
    render(<TodayView />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Plan my day' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Proposed plan')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan my day' })).toBeInTheDocument();
  });

  it('leads with what to do next, then the day', async () => {
    render(<TodayView />, { wrapper });

    expect(await screen.findByText('Good morning.')).toBeInTheDocument();
    expect(await screen.findByText('Reply to the professor')).toBeInTheDocument();
    expect(screen.getByText(/The most pressing thing without a time/)).toBeInTheDocument();
    expect(await screen.findByText('Calculus lecture')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs your attention right now.')).toBeInTheDocument();
  });

  it('shows what needs attention with the numbers behind it', async () => {
    getHome.mockResolvedValue({
      ...quietHome,
      attention: [
        {
          id: 'not_enough_time:1',
          kind: 'not_enough_time',
          title: 'CSE homework',
          detail: 'Needs 2 hr. There is 1 hr of free working time before it is due.',
          taskId: '44444444-4444-4444-8444-444444444444',
        },
      ],
    });
    render(<TodayView />, { wrapper });

    expect(await screen.findByText('1 thing needs your attention.')).toBeInTheDocument();
    expect(screen.getByText('CSE homework')).toBeInTheDocument();
    expect(screen.getByText(/1 hr of free working time/)).toBeInTheDocument();
  });

  it('keeps the rest of the day when the timeline fails', async () => {
    getTimeline.mockRejectedValue(new Error('offline'));
    render(<TodayView />, { wrapper });

    expect(await screen.findByText('Good morning.')).toBeInTheDocument();
    expect(await screen.findByText('Your day could not be loaded.')).toBeInTheDocument();
  });

  it('offers a retry when Home itself fails', async () => {
    getHome.mockRejectedValue(new Error('offline'));
    render(<TodayView />, { wrapper });

    expect(await screen.findByText('Home could not be loaded.')).toBeInTheDocument();
  });

  it('points at calendar setup on a genuinely empty day', async () => {
    getTimeline.mockResolvedValue({ ...timeline, blocks: [], busyMinutes: 0 });
    render(<TodayView />, { wrapper });

    expect(await screen.findByText('Nothing scheduled.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connect a calendar' })).toHaveAttribute(
      'href',
      '/settings/integrations',
    );
  });
});
