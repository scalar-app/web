import type { PlanPreview as PlanPreviewData } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { PlanPreview } from './PlanPreview';

const applyPlan = vi.fn();

const listIntegrations = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    planner: { apply: (input: unknown) => applyPlan(input) as unknown },
    integrations: { list: () => listIntegrations() as unknown },
  },
}));

function plan(over: Partial<PlanPreviewData> = {}): PlanPreviewData {
  return {
    rangeStart: '2026-08-19T08:00:00.000Z',
    rangeEnd: '2026-08-26T08:00:00.000Z',
    timeZone: 'UTC',
    blocks: [
      {
        taskId: '11111111-1111-4111-8111-111111111111',
        title: 'Finish problem set',
        startAt: '2026-08-19T09:00:00.000Z',
        endAt: '2026-08-19T10:00:00.000Z',
        minutes: 60,
        reasons: ['due_within_24_hours', 'fits_available_window'],
      },
      {
        taskId: '22222222-2222-4222-8222-222222222222',
        title: 'Draft the report',
        startAt: '2026-08-19T10:30:00.000Z',
        endAt: '2026-08-19T11:30:00.000Z',
        minutes: 60,
        reasons: ['earliest_available', 'fits_available_window'],
      },
    ],
    unscheduled: [],
    conflicts: [],
    warnings: [],
    ...over,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('PlanPreview', () => {
  beforeEach(() => {
    applyPlan.mockReset();
    applyPlan.mockResolvedValue({ applied: 2, taskIds: ['a', 'b'] });
    listIntegrations.mockReset();
    listIntegrations.mockResolvedValue([]);
  });

  function account(canWriteCalendar: boolean) {
    return [
      {
        id: 'acc_1',
        provider: 'google_calendar',
        displayName: 'ada@example.com',
        status: 'active',
        connectedAt: '2026-08-18T10:00:00.000Z',
        resources: [],
        canWriteCalendar,
      },
    ];
  }

  /**
   * Publishing is the only thing on this panel that other people can see, so it is off every time
   * the panel opens and is never remembered. A ticked box from three weeks ago is not consent.
   */
  it('does not offer the calendar when no calendar would take it', async () => {
    listIntegrations.mockResolvedValue(account(false));
    render(<PlanPreview plan={plan()} />, { wrapper });

    expect(await screen.findByText('Proposed plan')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: /Also put these on my calendar/ }),
    ).not.toBeInTheDocument();
  });

  it('applies without publishing unless the box is ticked', async () => {
    listIntegrations.mockResolvedValue(account(true));
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(await screen.findByRole('button', { name: 'Apply plan' }));

    await waitFor(() => {
      expect(applyPlan).toHaveBeenCalled();
    });
    expect(applyPlan.mock.calls[0]?.[0]).not.toHaveProperty('publishToCalendar');
  });

  it('publishes when asked', async () => {
    listIntegrations.mockResolvedValue(account(true));
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(
      await screen.findByRole('checkbox', { name: /Also put these on my calendar/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply plan' }));

    await waitFor(() => {
      expect(applyPlan.mock.calls[0]?.[0]).toMatchObject({ publishToCalendar: true });
    });
  });

  /** The plan is saved either way, and saying otherwise would send somebody looking for it. */
  it('says the plan was saved when the calendar refused it', async () => {
    listIntegrations.mockResolvedValue(account(true));
    applyPlan.mockResolvedValue({
      applied: 2,
      taskIds: ['a', 'b'],
      published: [{ taskId: 'a', status: 'failed', reason: 'Google refused the write.' }],
    });
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(
      await screen.findByRole('checkbox', { name: /Also put these on my calendar/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply plan' }));

    expect(
      await screen.findByText('Your plan was saved. Some blocks did not reach the calendar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Google refused the write.')).toBeInTheDocument();
  });

  it('says nothing has changed yet, and explains each block', async () => {
    render(<PlanPreview plan={plan()} />, { wrapper });

    expect(screen.getByText(/Nothing has changed yet/)).toBeInTheDocument();
    expect(screen.getByText('Finish problem set')).toBeInTheDocument();
    expect(screen.getByText(/due within a day/)).toBeInTheDocument();
    expect(applyPlan).not.toHaveBeenCalled();
  });

  it('applies every block when nothing is unchecked', async () => {
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Apply plan' }));

    await waitFor(() => {
      expect(applyPlan).toHaveBeenCalledTimes(1);
    });
    const sent = applyPlan.mock.calls[0]?.[0] as { blocks: { taskId: string }[] };
    expect(sent.blocks).toHaveLength(2);
  });

  it('leaves out what the person unchecked, and says how many will apply', async () => {
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(screen.getByRole('checkbox', { name: /Draft the report/ }));
    const button = screen.getByRole('button', { name: 'Apply 1 of 2' });
    await userEvent.click(button);

    await waitFor(() => {
      expect(applyPlan).toHaveBeenCalledTimes(1);
    });
    const sent = applyPlan.mock.calls[0]?.[0] as { blocks: { taskId: string }[] };
    expect(sent.blocks.map((b) => b.taskId)).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('cannot apply an empty plan', async () => {
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(screen.getByRole('checkbox', { name: /Finish problem set/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Draft the report/ }));

    expect(screen.getByRole('button', { name: 'Apply 0 of 2' })).toBeDisabled();
    expect(applyPlan).not.toHaveBeenCalled();
  });

  it('says nothing was saved when the day changed underneath the plan', async () => {
    applyPlan.mockRejectedValue(Object.assign(new Error('stale'), { code: 'PLAN_STALE' }));
    render(<PlanPreview plan={plan()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Apply plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your day changed while this plan was open. Nothing was saved.',
    );
  });

  it('shows what could not be fitted, with the reason', () => {
    render(
      <PlanPreview
        plan={plan({
          blocks: [],
          unscheduled: [
            {
              taskId: '33333333-3333-4333-8333-333333333333',
              title: 'Rewrite everything',
              kind: 'task_too_large_for_window',
              detail: 'This needs 600 minutes and the largest free block is 480.',
            },
          ],
        })}
      />,
      { wrapper },
    );

    expect(screen.getByText('Could not fit')).toBeInTheDocument();
    expect(screen.getByText(/largest free block is 480/)).toBeInTheDocument();
  });

  it('says so plainly when there is nothing to plan', () => {
    render(<PlanPreview plan={plan({ blocks: [], unscheduled: [] })} />, { wrapper });
    expect(screen.getByText(/nothing waiting for a time/)).toBeInTheDocument();
  });
});
