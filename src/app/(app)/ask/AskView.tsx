'use client';

import type { CommandAction, CommandResponse, CommandThreadDetail } from '@scalar/sdk';
import { Button, EmptyState, Spinner, Textarea } from '@scalar/ui';
import { ArrowUp, History, SquarePen } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { ApprovalCard } from '@/components/command/ApprovalCard';
import { HistoryDialog } from '@/components/command/HistoryDialog';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import { isAiUnavailable, useAsk, useLoadThread } from '@/lib/queries/command';

interface Turn {
  id: string;
  question: string;
  answer: string | null;
  actions: CommandAction[];
  stopReason: CommandResponse['stopReason'] | null;
  refusalCategory: string | null;
  failed: boolean;
}

const SUGGESTIONS = [
  'What do I have due this week?',
  'What does tomorrow look like?',
  'Find me two free hours on Thursday',
];

/**
 * Rebuilds a stored thread as turns.
 *
 * Messages are stored flat, alternating user then assistant. A user message opens a turn and the
 * assistant message that follows completes it, so an unanswered question at the end of a thread
 * still shows rather than being dropped.
 */
function toTurns(thread: CommandThreadDetail): Turn[] {
  const turns: Turn[] = [];
  for (const message of thread.messages) {
    if (message.role === 'user') {
      turns.push({
        id: message.id,
        question: message.content,
        answer: null,
        actions: [],
        stopReason: null,
        refusalCategory: null,
        failed: false,
      });
      continue;
    }
    const open = turns.at(-1);
    if (!open || open.answer !== null) continue;
    open.answer = message.content;
    open.actions = message.actions;
    open.stopReason = message.stopReason as Turn['stopReason'];
    open.refusalCategory = message.refusalCategory;
  }
  // A question whose answer never arrived reads as a failure rather than as a pending request.
  return turns.map((turn) => (turn.answer === null ? { ...turn, failed: true } : turn));
}

function answerText(turn: Turn): string {
  if (turn.failed) return 'Something went wrong answering that. Try asking again.';
  if (turn.stopReason === 'refused') {
    return 'I cannot help with that one. Nothing was changed.';
  }
  if (turn.stopReason === 'max_steps') {
    return 'I could not work that out in a reasonable number of steps. Try asking something narrower.';
  }
  if (turn.stopReason === 'max_tokens') {
    return `${turn.answer ?? ''}\n\nThat answer was cut short. Ask for a smaller piece of it.`.trim();
  }
  return turn.answer ?? '';
}

/**
 * Ask is a conversation with a hard rule: reading happens automatically, changing never does.
 * Answers arrive as text; anything that would alter tasks or the calendar arrives as a card with
 * Approve and Dismiss, and stays inert until one is pressed.
 */
export function AskView({ initialQuestion }: { initialQuestion?: string }) {
  const searchParams = useSearchParams();
  const handedOver = initialQuestion ?? searchParams.get('q') ?? undefined;
  const ask = useAsk();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const loadThread = useLoadThread();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Refs rather than state so `send` stays stable across renders: it is called from an effect,
  // and a changing identity there is how a question ends up asked twice.
  const threadIdRef = useRef<string | null>(null);
  const turnCount = useRef(0);
  const askedInitial = useRef(false);
  const { mutateAsync } = ask;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  // A thread opened from history replaces the conversation on screen and becomes the one the next
  // question continues.
  async function openThread(id: string) {
    try {
      const thread = await loadThread.mutateAsync(id);
      setTurns(toTurns(thread));
      threadIdRef.current = thread.id;
      setActiveThreadId(thread.id);
      turnCount.current = thread.messages.length;
    } catch {
      /* shown through loadThread.isError */
    }
  }

  function startNew() {
    setTurns([]);
    setQuestion('');
    threadIdRef.current = null;
    setActiveThreadId(null);
    loadThread.reset();
  }

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      turnCount.current += 1;
      const id = `turn-${String(turnCount.current)}`;
      setQuestion('');
      setTurns((current) => [
        ...current,
        {
          id,
          question: trimmed,
          answer: null,
          actions: [],
          stopReason: null,
          refusalCategory: null,
          failed: false,
        },
      ]);

      try {
        const result = await mutateAsync({
          message: trimmed,
          ...(threadIdRef.current ? { threadId: threadIdRef.current } : {}),
        });
        threadIdRef.current = result.threadId;
        setActiveThreadId(result.threadId);
        setTurns((current) =>
          current.map((turn) =>
            turn.id === id
              ? {
                  ...turn,
                  answer: result.answer,
                  actions: result.actions,
                  stopReason: result.stopReason,
                  refusalCategory: result.refusalCategory,
                }
              : turn,
          ),
        );
      } catch {
        // The error is shown in place of the answer, so the question stays on screen.
        setTurns((current) =>
          current.map((turn) => (turn.id === id ? { ...turn, failed: true } : turn)),
        );
      }
    },
    [mutateAsync],
  );

  // A question handed over from the command palette is asked once, on arrival.
  useEffect(() => {
    if (!handedOver || askedInitial.current) return;
    askedInitial.current = true;
    void send(handedOver);
  }, [handedOver, send]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(question);
  }

  // Enter sends, Shift+Enter adds a line. Enter never approves anything: approval is its own click.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(question);
    }
  }

  if (isAiUnavailable(ask.error)) {
    return (
      <>
        <PageHeader title="Ask" description="Questions about your work, answered from your data." />
        <EmptyState
          title="Ask is not set up on this server."
          description="Scalar Command needs a model API key. Add ANTHROPIC_API_KEY to the API environment and restart it. Everything else in Scalar works without one."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ask"
        description="Questions about your work, answered from your data."
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={startNew}
              disabled={turns.length === 0}
              className="min-h-11 md:min-h-0"
            >
              <SquarePen size={14} aria-hidden />
              New
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen(true)}
              className="min-h-11 md:min-h-0"
            >
              <History size={14} aria-hidden />
              History
            </Button>
          </>
        }
      />

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={(id) => void openThread(id)}
        activeThreadId={activeThreadId}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto pb-4">
          {loadThread.isPending ? (
            <p className="flex items-center gap-2 py-4 text-[13px] text-muted">
              <Spinner size={13} label="Loading conversation" />
              Loading that conversation
            </p>
          ) : null}

          {loadThread.isError ? (
            <div className="py-4">
              <ErrorNotice title="That conversation could not be opened." />
            </div>
          ) : null}

          {turns.length === 0 && !loadThread.isPending ? (
            <div className="mt-2">
              <p className="text-[13px] text-secondary">
                Ask about your tasks and calendar. Scalar reads to answer, and asks before it
                changes anything.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-md border border-border px-3 py-2 text-left text-[13px] text-secondary hover:bg-raised hover:text-primary"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ol className="flex flex-col gap-6">
            {turns.map((turn) => (
              <li key={turn.id} className="flex flex-col gap-3">
                <p className="text-[13px] font-medium text-primary">{turn.question}</p>

                {turn.answer === null && !turn.failed ? (
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <Spinner size={13} label="Thinking" />
                    Thinking
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap text-[13px] text-secondary">
                    {answerText(turn)}
                  </p>
                )}

                {turn.actions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {turn.actions.map((action) => (
                      <ApprovalCard key={action.id} action={action} />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          <div ref={endRef} />
        </div>

        {ask.isError && !isAiUnavailable(ask.error) ? (
          <div className="mb-3">
            <ErrorNotice title="That question could not be sent." />
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="sticky bottom-0 flex items-end gap-2 bg-base pt-2">
          <Textarea
            ref={inputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your tasks and calendar"
            aria-label="Ask Scalar"
            rows={2}
            className="flex-1 resize-none"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={ask.isPending || question.trim().length === 0}
            aria-label="Send question"
          >
            {ask.isPending ? <Spinner size={14} /> : <ArrowUp size={14} aria-hidden />}
          </Button>
        </form>
        <p className="pb-2 pt-2 text-[12px] text-muted">
          Scalar can be wrong. It never changes anything without asking you first.
        </p>
      </div>
    </>
  );
}
