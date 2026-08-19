'use client';

import type { PlanPreview as PlanPreviewData, PlanReason } from '@scalar/sdk';
import { Button, Checkbox, Panel } from '@scalar/ui';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useApplyPlan } from '@/lib/queries/planner';
import { formatDay, formatTime } from '@/lib/time';

/**
 * A plan, before it is anyone's day.
 *
 * Scalar does not rearrange someone's life and tell them afterwards. Everything here is a
 * proposal: the person reads it, drops what they disagree with, and applies the rest. Nothing has
 * been written when this appears, and Apply is a deliberate single action rather than a default.
 */

const REASON_TEXT: Record<PlanReason, string> = {
  due_within_24_hours: 'due within a day',
  due_soon: 'due this week',
  high_priority: 'high priority',
  earliest_available: 'the earliest free time',
  fits_available_window: 'fits the free time you have',
  preferred_focus_period: 'in your preferred hours',
  before_deadline: 'finishes before it is due',
  after_dependency: 'after what it depends on',
};

/** The two or three that actually explain the choice, rather than all of them. */
function explain(reasons: PlanReason[]): string {
  const ranked: PlanReason[] = [
    'due_within_24_hours',
    'due_soon',
    'high_priority',
    'preferred_focus_period',
    'after_dependency',
    'earliest_available',
    'fits_available_window',
  ];
  const chosen = ranked.filter((reason) => reasons.includes(reason)).slice(0, 2);
  return chosen.map((reason) => REASON_TEXT[reason]).join(', ');
}

function dayLabel(iso: string): string {
  return formatDay(new Date(iso));
}

export interface PlanPreviewProps {
  plan: PlanPreviewData;
  /** Called once a plan has been written, so a parent can close or refresh. */
  onApplied?: (applied: number) => void;
  onCancel?: () => void;
}

export function PlanPreview({ plan, onApplied, onCancel }: PlanPreviewProps) {
  const apply = useApplyPlan();
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const included = plan.blocks.filter((block) => !excluded.has(block.taskId));
  const stale = apply.isError && (apply.error as { code?: string } | null)?.code === 'PLAN_STALE';

  function toggle(taskId: string, on: boolean): void {
    setExcluded((current) => {
      const next = new Set(current);
      if (on) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    apply.reset();
  }

  async function onApply(): Promise<void> {
    if (included.length === 0) return;
    try {
      const result = await apply.mutateAsync({
        blocks: included.map(({ taskId, startAt, endAt }) => ({ taskId, startAt, endAt })),
      });
      onApplied?.(result.applied);
    } catch {
      /* shown through apply.isError */
    }
  }

  if (plan.blocks.length === 0 && plan.unscheduled.length === 0) {
    return (
      <Panel title="Plan">
        <p className="text-[13px] text-secondary">
          There is nothing waiting for a time. Everything open already has one.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Proposed plan">
      <p className="text-[13px] text-secondary">
        Nothing has changed yet. Uncheck anything you disagree with, then apply.
      </p>

      {plan.blocks.length > 0 ? (
        <ul className="mt-4 flex flex-col">
          {plan.blocks.map((block) => (
            <li key={block.taskId} className="border-b border-border py-2.5 last:border-b-0">
              <Checkbox
                checked={!excluded.has(block.taskId)}
                onChange={(event) => {
                  toggle(block.taskId, event.target.checked);
                }}
                label={<span className="text-[13px] text-primary">{block.title}</span>}
                description={
                  <span className="text-[12px] text-muted">
                    {dayLabel(block.startAt)} · {formatTime(block.startAt)} to{' '}
                    {formatTime(block.endAt)} · {block.minutes} min
                    {explain(block.reasons) ? ` · ${explain(block.reasons)}` : ''}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}

      {plan.unscheduled.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Could not fit
          </h3>
          <ul className="mt-2 flex flex-col">
            {plan.unscheduled.map((item) => (
              <li
                key={item.taskId}
                className="border-b border-border py-2.5 text-[13px] last:border-b-0"
              >
                <span className="text-primary">{item.title}</span>
                <span className="mt-0.5 block text-[12px] text-muted">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.warnings.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1">
          {plan.warnings.map((warning, index) => (
            <li key={`${warning.kind}-${index}`} className="text-[12px] text-muted">
              {warning.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {apply.isError ? (
        <div className="mt-4">
          <ErrorNotice
            title={
              stale
                ? 'Your day changed while this plan was open. Nothing was saved.'
                : 'That plan could not be applied. Nothing was saved.'
            }
          />
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button
          size="sm"
          loading={apply.isPending}
          disabled={included.length === 0}
          onClick={() => void onApply()}
        >
          {included.length === plan.blocks.length
            ? 'Apply plan'
            : `Apply ${String(included.length)} of ${String(plan.blocks.length)}`}
        </Button>
        {onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={apply.isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
