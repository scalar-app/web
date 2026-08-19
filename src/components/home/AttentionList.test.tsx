import type { AttentionItem } from '@scalar/sdk';
import { render, screen } from '@testing-library/react';
import { AttentionList } from './AttentionList';

function item(over: Partial<AttentionItem> = {}): AttentionItem {
  return {
    id: 'overdue:1',
    kind: 'overdue',
    title: 'Problem set',
    detail: 'Was due 2 hr ago.',
    taskId: '11111111-1111-4111-8111-111111111111',
    ...over,
  };
}

describe('AttentionList', () => {
  it('shows the reason with the numbers, not just a warning', () => {
    render(
      <AttentionList
        items={[
          item({
            id: 'not_enough_time:1',
            kind: 'not_enough_time',
            title: 'CSE homework',
            detail: 'Needs 2 hr. There is 1 hr 20 min of free working time before it is due.',
          }),
        ]}
      />,
    );

    expect(screen.getByText('CSE homework')).toBeInTheDocument();
    expect(
      screen.getByText(/There is 1 hr 20 min of free working time before it is due/),
    ).toBeInTheDocument();
    expect(screen.getByText('Not enough time')).toBeInTheDocument();
  });

  it('points at settings for problems that are about Scalar rather than the work', () => {
    render(
      <AttentionList
        items={[
          item({
            id: 'integration:1',
            kind: 'integration_disconnected',
            title: 'Google Calendar needs reconnecting',
            detail: 'Sign in again from Settings to keep it up to date.',
            taskId: null,
          }),
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings/integrations',
    );
  });

  it('renders nothing at all when nothing needs attention', () => {
    const { container } = render(<AttentionList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
