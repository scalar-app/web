import type { CommandAction } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ApprovalCard } from './ApprovalCard';

const approve = vi.fn();
const reject = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    command: {
      approve: (id: string) => approve(id) as unknown,
      reject: (id: string) => reject(id) as unknown,
    },
  },
}));

function action(over: Partial<CommandAction> = {}): CommandAction {
  return {
    id: 'act_1',
    tool: 'create_task',
    classification: 'write',
    summary: 'Create task "Email the TA"',
    status: 'pending',
    createdAt: '2026-08-18T10:00:00.000Z',
    ...over,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  approve.mockReset();
  reject.mockReset();
});

describe('ApprovalCard', () => {
  it('says nothing has happened yet and offers both decisions', () => {
    render(<ApprovalCard action={action()} />, { wrapper });

    expect(screen.getByText('Create task "Email the TA"')).toBeInTheDocument();
    expect(screen.getByText(/Nothing has changed yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Approve:/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Dismiss:/ })).toBeInTheDocument();
  });

  it('does nothing until the person approves', async () => {
    approve.mockResolvedValue({
      action: action({ status: 'executed' }),
      resultId: 't1',
      error: null,
    });
    render(<ApprovalCard action={action()} />, { wrapper });

    expect(approve).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /^Approve:/ }));

    await waitFor(() => {
      expect(approve).toHaveBeenCalledWith('act_1');
    });
    expect(await screen.findByText('Done')).toBeInTheDocument();
  });

  it('removes the buttons once decided, so it cannot be approved twice', async () => {
    approve.mockResolvedValue({
      action: action({ status: 'executed' }),
      resultId: 't1',
      error: null,
    });
    render(<ApprovalCard action={action()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /^Approve:/ }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Approve:/ })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^Dismiss:/ })).not.toBeInTheDocument();
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it('dismisses without calling approve', async () => {
    reject.mockResolvedValue(action({ status: 'rejected' }));
    render(<ApprovalCard action={action()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /^Dismiss:/ }));

    expect(await screen.findByText('Dismissed')).toBeInTheDocument();
    expect(approve).not.toHaveBeenCalled();
  });

  it('reports an execution that did not run', async () => {
    approve.mockResolvedValue({
      action: action({ status: 'failed' }),
      resultId: null,
      error: 'Task not found.',
    });
    render(<ApprovalCard action={action()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /^Approve:/ }));

    expect(await screen.findByText('Did not run')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Task not found.');
  });

  it('keeps the card usable when the decision could not be sent', async () => {
    approve.mockRejectedValue(new Error('offline'));
    render(<ApprovalCard action={action()} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /^Approve:/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be sent/);
    expect(screen.getByRole('button', { name: /^Approve:/ })).toBeEnabled();
  });

  it('renders an already decided action without buttons', () => {
    render(<ApprovalCard action={action({ status: 'executed' })} />, { wrapper });

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
