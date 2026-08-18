import { ScalarApiError, type CommandResponse } from '@scalar/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AskView } from './AskView';

const ask = vi.fn();
const approve = vi.fn();
const reject = vi.fn();

vi.mock('@/lib/api', () => ({
  scalar: {
    command: {
      ask: (input: unknown) => ask(input) as unknown,
      approve: (id: string) => approve(id) as unknown,
      reject: (id: string) => reject(id) as unknown,
    },
  },
}));

function response(over: Partial<CommandResponse> = {}): CommandResponse {
  return {
    threadId: 'thr_1',
    messageId: 'msg_1',
    answer: 'Nothing is due today.',
    actions: [],
    stopReason: 'answered',
    refusalCategory: null,
    usage: { inputTokens: 10, outputTokens: 5 },
    ...over,
  };
}

const proposal = {
  id: 'act_1',
  tool: 'create_task',
  classification: 'write',
  summary: 'Create task "Email the TA"',
  status: 'pending' as const,
  createdAt: '2026-08-18T10:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  ask.mockReset();
  approve.mockReset();
  reject.mockReset();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('AskView', () => {
  it('sends a question and shows the answer', async () => {
    ask.mockResolvedValue(response());
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'what is due today?');
    await userEvent.click(screen.getByRole('button', { name: 'Send question' }));

    expect(await screen.findByText('Nothing is due today.')).toBeInTheDocument();
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ message: 'what is due today?' }));
  });

  it('sends on Enter and keeps Shift+Enter for a new line', async () => {
    ask.mockResolvedValue(response());
    render(<AskView />, { wrapper });
    const box = screen.getByLabelText('Ask Scalar');

    await userEvent.type(box, 'first{Shift>}{Enter}{/Shift}second');
    expect(ask).not.toHaveBeenCalled();

    await userEvent.type(box, '{Enter}');
    await waitFor(() => {
      expect(ask).toHaveBeenCalledTimes(1);
    });
  });

  it('continues the same thread on the second question', async () => {
    ask.mockResolvedValue(response());
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'one{Enter}');
    await waitFor(() => {
      expect(ask).toHaveBeenCalledTimes(1);
    });
    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'two{Enter}');

    await waitFor(() => {
      expect(ask).toHaveBeenLastCalledWith(expect.objectContaining({ threadId: 'thr_1' }));
    });
    expect(ask.mock.calls[0]?.[0]).not.toHaveProperty('threadId');
  });

  it('shows a proposed change as a card and changes nothing on its own', async () => {
    ask.mockResolvedValue(
      response({ answer: 'I can add that.', stopReason: 'needs_approval', actions: [proposal] }),
    );
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'add a task{Enter}');

    expect(await screen.findByTestId('approval-card')).toBeInTheDocument();
    expect(screen.getByText('Create task "Email the TA"')).toBeInTheDocument();
    expect(approve).not.toHaveBeenCalled();
  });

  it('approves only when the button is pressed', async () => {
    ask.mockResolvedValue(
      response({ answer: 'I can add that.', stopReason: 'needs_approval', actions: [proposal] }),
    );
    approve.mockResolvedValue({
      action: { ...proposal, status: 'executed' },
      resultId: 't1',
      error: null,
    });
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'add a task{Enter}');
    await screen.findByTestId('approval-card');

    await userEvent.click(screen.getByRole('button', { name: /^Approve:/ }));

    await waitFor(() => {
      expect(approve).toHaveBeenCalledWith('act_1');
    });
    expect(await screen.findByText('Done')).toBeInTheDocument();
  });

  it('explains a refusal without inventing an answer', async () => {
    ask.mockResolvedValue(
      response({ answer: '', stopReason: 'refused', refusalCategory: 'cyber' }),
    );
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'something disallowed{Enter}');

    expect(await screen.findByText(/cannot help with that one/)).toBeInTheDocument();
  });

  it('keeps the question on screen when the request fails', async () => {
    ask.mockRejectedValue(new Error('offline'));
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'what is due?{Enter}');

    expect(await screen.findByText('what is due?')).toBeInTheDocument();
    expect(await screen.findByText(/Something went wrong answering that/)).toBeInTheDocument();
  });

  it('says the feature is not configured when the server has no key', async () => {
    ask.mockRejectedValue(
      new ScalarApiError({
        status: 503,
        code: 'AI_UNAVAILABLE',
        message: 'Scalar Command is not configured on this server.',
      }),
    );
    render(<AskView />, { wrapper });

    await userEvent.type(screen.getByLabelText('Ask Scalar'), 'hello{Enter}');

    expect(await screen.findByText(/not set up on this server/)).toBeInTheDocument();
  });

  it('asks a handed over question straight away', async () => {
    ask.mockResolvedValue(response());
    render(<AskView initialQuestion="what is due today?" />, { wrapper });

    await waitFor(() => {
      expect(ask).toHaveBeenCalledWith(expect.objectContaining({ message: 'what is due today?' }));
    });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('will not send an empty question', async () => {
    render(<AskView />, { wrapper });

    expect(screen.getByRole('button', { name: 'Send question' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Ask Scalar'), '   {Enter}');
    expect(ask).not.toHaveBeenCalled();
  });
});
