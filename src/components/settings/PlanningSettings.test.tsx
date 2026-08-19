import type { Preferences } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { PlanningSettings } from './PlanningSettings';

const getPreferences = vi.fn();
const updatePreferences = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    preferences: {
      get: () => getPreferences() as unknown,
      update: (input: unknown) => updatePreferences(input) as unknown,
    },
  },
}));

const defaults: Preferences = {
  timeZone: 'UTC',
  weekStartsOn: 1,
  workdayStartMinute: 540,
  workdayEndMinute: 1020,
  workDays: [1, 2, 3, 4, 5],
  defaultFocusMinutes: 50,
  minimumBufferMinutes: 10,
  autoSchedule: 'suggest',
  durationLearningEnabled: true,
  updatedAt: null,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('PlanningSettings', () => {
  beforeEach(() => {
    getPreferences.mockReset();
    updatePreferences.mockReset();
    getPreferences.mockResolvedValue(defaults);
  });

  it('offers time zones to type into rather than a list to scroll', async () => {
    render(<PlanningSettings />, { wrapper });

    const field = await screen.findByLabelText(/Time zone/);
    expect(field).toHaveValue('UTC');
    // A datalist, so the browser filters as you type instead of showing several hundred rows.
    expect(field).toHaveAttribute('list', 'scalar-time-zones');
    const options = document.querySelectorAll('#scalar-time-zones option');
    expect(options.length).toBeGreaterThan(50);
  });

  it('refuses a zone the server would reject, rather than sending it', async () => {
    render(<PlanningSettings />, { wrapper });

    const field = await screen.findByLabelText(/Time zone/);
    await userEvent.clear(field);
    await userEvent.type(field, 'Mars/Olympus');

    expect(await screen.findByRole('alert')).toHaveTextContent('not a time zone this server knows');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('accepts a real zone typed in full', async () => {
    updatePreferences.mockResolvedValue({ ...defaults, timeZone: 'Europe/Tallinn' });
    render(<PlanningSettings />, { wrapper });

    const field = await screen.findByLabelText(/Time zone/);
    await userEvent.clear(field);
    await userEvent.type(field, 'Europe/Tallinn');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalled();
    });
    expect(updatePreferences.mock.calls[0]?.[0]).toMatchObject({ timeZone: 'Europe/Tallinn' });
  });

  it('shows the stored working day and keeps Save disabled until something changes', async () => {
    render(<PlanningSettings />, { wrapper });

    const start = await screen.findByLabelText('Working day starts');
    expect(start).toHaveValue('09:00');
    expect(screen.getByLabelText('Working day ends')).toHaveValue('17:00');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sends only what the person changed', async () => {
    updatePreferences.mockResolvedValue({
      ...defaults,
      workdayStartMinute: 480,
      updatedAt: '2026-08-19T10:00:00.000Z',
    });
    render(<PlanningSettings />, { wrapper });

    // A time input takes a whole value rather than keystrokes.
    fireEvent.change(await screen.findByLabelText('Working day starts'), {
      target: { value: '08:00' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalledTimes(1);
    });
    expect(updatePreferences.mock.calls[0]?.[0]).toMatchObject({
      workdayStartMinute: 480,
      workdayEndMinute: 1020,
      timeZone: 'UTC',
    });
  });

  it('refuses to save a day that ends before it starts', async () => {
    render(<PlanningSettings />, { wrapper });

    fireEvent.change(await screen.findByLabelText('Working day starts'), {
      target: { value: '18:00' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('end after it starts');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('refuses to save with no working days', async () => {
    render(<PlanningSettings />, { wrapper });

    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      await userEvent.click(await screen.findByLabelText(day));
    }

    expect(await screen.findByRole('alert')).toHaveTextContent('at least one day');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('offers a retry when preferences cannot be loaded', async () => {
    getPreferences.mockRejectedValue(new Error('offline'));
    render(<PlanningSettings />, { wrapper });

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
