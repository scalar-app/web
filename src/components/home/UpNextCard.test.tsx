import type { UpNext } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { UpNextCard } from './UpNextCard';

const push = vi.fn();
const startFocus = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', () => ({
  scalar: { focus: { start: (input: unknown) => startFocus(input) as unknown } },
}));

function upNext(over: Partial<UpNext> = {}): UpNext {
  return {
    kind: 'task',
    itemId: '11111111-1111-4111-8111-111111111111',
    taskId: '11111111-1111-4111-8111-111111111111',
    title: 'Reply to the professor',
    startAt: null,
    endAt: null,
    estimatedMinutes: 15,
    reason: 'most_urgent_unscheduled',
    ...over,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('UpNextCard', () => {
  beforeEach(() => {
    push.mockReset();
    startFocus.mockReset();
    startFocus.mockResolvedValue({ id: 'f1' });
  });

  it('says what to do and why', () => {
    render(<UpNextCard upNext={upNext()} />, { wrapper });

    expect(screen.getByText('Reply to the professor')).toBeInTheDocument();
    expect(screen.getByText(/The most pressing thing without a time/)).toBeInTheDocument();
    expect(screen.getByText(/About 15 min/)).toBeInTheDocument();
  });

  it('starts a session on the thing it named, and goes there', async () => {
    render(<UpNextCard upNext={upNext()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Start focus' }));

    await waitFor(() => {
      expect(startFocus).toHaveBeenCalledWith({
        taskId: '11111111-1111-4111-8111-111111111111',
      });
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/focus');
    });
  });

  it('offers a way back into a session already running', async () => {
    render(
      <UpNextCard
        upNext={upNext({
          kind: 'focus',
          reason: 'focus_in_progress',
          startAt: '2026-08-19T09:50:00.000Z',
        })}
      />,
      { wrapper },
    );

    expect(screen.getByText('You are focusing on this now · In progress')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to focus' }));
    expect(push).toHaveBeenCalledWith('/focus');
    expect(startFocus).not.toHaveBeenCalled();
  });

  it('shows the time for something on the clock, and offers no focus for an event', () => {
    render(
      <UpNextCard
        upNext={upNext({
          kind: 'event',
          taskId: null,
          title: 'Calculus',
          reason: 'happening_now',
          startAt: '2026-08-19T09:00:00.000Z',
          endAt: '2026-08-19T10:15:00.000Z',
        })}
      />,
      { wrapper },
    );

    expect(screen.getByText(/Happening now/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start focus' })).not.toBeInTheDocument();
  });

  it('says plainly when there is nothing to do', () => {
    render(<UpNextCard upNext={upNext({ kind: 'nothing', reason: 'nothing_to_do' })} />, {
      wrapper,
    });

    expect(screen.getByText(/Nothing is scheduled and nothing is waiting/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
