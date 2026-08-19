import type { Timeline as TimelineData, TimelineBlock } from '@scalar/sdk';
import { render, screen, within } from '@testing-library/react';
import { Timeline } from './Timeline';

function block(over: Partial<TimelineBlock> = {}): TimelineBlock {
  return {
    id: over.id ?? 'event:e1',
    itemId: over.itemId ?? 'e1',
    blockType: over.blockType ?? 'event',
    title: over.title ?? 'Calculus',
    startAt: over.startAt ?? '2026-08-19T09:00:00.000Z',
    endAt: over.endAt ?? '2026-08-19T10:00:00.000Z',
    allDay: over.allDay ?? false,
    locked: over.locked ?? true,
    source: over.source ?? 'integration',
    status: over.status ?? null,
    priority: over.priority ?? null,
    spaceId: null,
    projectId: null,
    location: over.location ?? null,
    ...over,
  };
}

function day(blocks: TimelineBlock[], conflicts: TimelineData['conflicts'] = []): TimelineData {
  return { date: '2026-08-19', timeZone: 'UTC', blocks, busyMinutes: 0, conflicts };
}

describe('Timeline', () => {
  it('lists blocks in the order it is given', () => {
    render(
      <Timeline
        data={day([
          block({ id: 'event:e1', title: 'Calculus' }),
          block({
            id: 'task:t1',
            blockType: 'task',
            title: 'Finish problem set',
            startAt: '2026-08-19T10:30:00.000Z',
            endAt: '2026-08-19T11:15:00.000Z',
            locked: false,
            source: 'manual',
            status: 'todo',
          }),
        ])}
        now={new Date('2026-08-19T08:00:00.000Z')}
      />,
    );

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText('Calculus')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Finish problem set')).toBeInTheDocument();
  });

  it('shows a duration for a task block and All day for an all-day one', () => {
    render(
      <Timeline
        data={day([
          block({
            id: 'task:t1',
            blockType: 'task',
            title: 'Deep work',
            startAt: '2026-08-19T13:00:00.000Z',
            endAt: '2026-08-19T14:30:00.000Z',
          }),
          block({
            id: 'event:e2',
            title: 'Holiday',
            allDay: true,
            startAt: '2026-08-19T00:00:00.000Z',
            endAt: '2026-08-20T00:00:00.000Z',
          }),
        ])}
        now={new Date('2026-08-19T08:00:00.000Z')}
      />,
    );

    expect(screen.getByText(/1 hr 30 min/)).toBeInTheDocument();
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('marks the block happening right now', () => {
    render(
      <Timeline
        data={day([
          block({ id: 'event:e1', title: 'Calculus' }),
          block({
            id: 'event:e2',
            title: 'Later',
            startAt: '2026-08-19T15:00:00.000Z',
            endAt: '2026-08-19T16:00:00.000Z',
          }),
        ])}
        now={new Date('2026-08-19T09:30:00.000Z')}
      />,
    );

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveAttribute('aria-current', 'time');
    expect(rows[1]).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('says when a block overlaps another', () => {
    render(
      <Timeline
        data={day(
          [
            block({ id: 'event:e1', title: 'Calculus' }),
            block({
              id: 'event:e2',
              title: 'Advising',
              startAt: '2026-08-19T09:30:00.000Z',
              endAt: '2026-08-19T10:30:00.000Z',
            }),
          ],
          [{ blockIds: ['event:e1', 'event:e2'] }],
        )}
        now={new Date('2026-08-19T08:00:00.000Z')}
      />,
    );

    expect(screen.getAllByText(/Overlaps another block/)).toHaveLength(2);
  });

  it('shows an empty state for a day with nothing in it', () => {
    render(<Timeline data={day([])} now={new Date('2026-08-19T08:00:00.000Z')} />);
    expect(screen.getByText('Nothing scheduled.')).toBeInTheDocument();
  });
});
