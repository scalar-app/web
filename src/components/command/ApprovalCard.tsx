'use client';

import type { CommandAction } from '@scalar/sdk';
import { Badge, Button, Spinner } from '@scalar/ui';
import { Check, CircleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { useApproveAction, useRejectAction } from '@/lib/queries/command';

/**
 * One proposed change, with the two buttons that decide it.
 *
 * The card states what will happen in the same words the person would use, and nothing has
 * happened yet when it appears. Approve is a deliberate, single action: it is never the default,
 * never focused automatically, and never triggered by pressing Enter in the composer.
 */

const toolLabel: Record<string, string> = {
  create_task: 'New task',
  update_task: 'Task change',
  schedule_task: 'Calendar time',
};

interface Settled {
  status: CommandAction['status'];
  error: string | null;
}

export interface ApprovalCardProps {
  action: CommandAction;
  /** Called after a decision, so a parent can refresh a thread it is showing. */
  onDecided?: (status: CommandAction['status']) => void;
}

export function ApprovalCard({ action, onDecided }: ApprovalCardProps) {
  const approve = useApproveAction();
  const reject = useRejectAction();
  const [settled, setSettled] = useState<Settled | null>(
    action.status === 'pending' ? null : { status: action.status, error: null },
  );

  const busy = approve.isPending || reject.isPending;
  const status = settled?.status ?? 'pending';
  const decided = status !== 'pending';

  // A network failure leaves the card pending on purpose, so the decision can be made again.
  // The mutation's own error state drives the message below.
  async function onApprove() {
    try {
      const result = await approve.mutateAsync(action.id);
      setSettled({ status: result.action.status, error: result.error });
      onDecided?.(result.action.status);
    } catch {
      /* shown through approve.isError */
    }
  }

  async function onReject() {
    try {
      const result = await reject.mutateAsync(action.id);
      setSettled({ status: result.status, error: null });
      onDecided?.(result.status);
    } catch {
      /* shown through reject.isError */
    }
  }

  const failedToDecide = approve.isError || reject.isError;

  return (
    <div
      className="rounded-md border border-border bg-raised px-4 py-3"
      data-testid="approval-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={decided ? 'neutral' : 'yellow'}>
          {toolLabel[action.tool] ?? action.tool.replace(/_/g, ' ')}
        </Badge>
        {status === 'executed' ? (
          <span className="flex items-center gap-1 text-[12px] text-success">
            <Check size={13} aria-hidden />
            Done
          </span>
        ) : null}
        {status === 'rejected' ? <span className="text-[12px] text-muted">Dismissed</span> : null}
        {status === 'failed' ? (
          <span className="flex items-center gap-1 text-[12px] text-danger">
            <CircleAlert size={13} aria-hidden />
            Did not run
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-[13px] text-primary">{action.summary}</p>

      {!decided ? (
        <>
          <p className="mt-1 text-[12px] text-muted">
            Nothing has changed yet. This happens only if you approve it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => void onApprove()}
              disabled={busy}
              aria-label={`Approve: ${action.summary}`}
              // A 44px target on phones. This is the most consequential control in the app and
              // the one place a mis-tap costs something, so it is not a 26px button on a phone.
              className="min-h-11 px-4 md:min-h-0 md:px-3"
            >
              {approve.isPending ? <Spinner size={13} /> : <Check size={14} aria-hidden />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void onReject()}
              disabled={busy}
              aria-label={`Dismiss: ${action.summary}`}
              className="min-h-11 px-4 md:min-h-0 md:px-3"
            >
              <X size={14} aria-hidden />
              Dismiss
            </Button>
          </div>
        </>
      ) : null}

      {settled?.error ? (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          {settled.error}
        </p>
      ) : null}

      {failedToDecide ? (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          That could not be sent. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
