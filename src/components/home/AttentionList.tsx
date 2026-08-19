'use client';

import type { AttentionItem } from '@scalar/sdk';
import Link from 'next/link';

/**
 * What needs a decision, and why.
 *
 * Every row carries the sentence the server computed, numbers included, because "this needs your
 * attention" without a reason is just anxiety. Nothing here is ranked by a model: the order is
 * how much it costs to ignore.
 */

const KIND_LABEL: Record<AttentionItem['kind'], string> = {
  overdue: 'Overdue',
  not_enough_time: 'Not enough time',
  due_soon: 'Due soon',
  schedule_conflict: 'Conflict',
  unscheduled_urgent: 'Urgent',
  integration_disconnected: 'Disconnected',
  sync_failing: 'Sync failing',
};

/** The two kinds that are about Scalar rather than about the work. */
const SETTINGS_KINDS = new Set<AttentionItem['kind']>(['integration_disconnected', 'sync_failing']);

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="attention-heading" className="mb-10">
      <h2
        id="attention-heading"
        className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
      >
        Needs attention
      </h2>
      <div className="border-t border-border" />
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id} className="border-b border-border py-2.5 last:border-b-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-[13px] text-primary">{item.title}</span>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-muted">
                {KIND_LABEL[item.kind]}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              {item.detail}
              {SETTINGS_KINDS.has(item.kind) ? (
                <>
                  {' '}
                  <Link
                    href="/settings/integrations"
                    className="text-secondary underline-offset-2 hover:text-primary"
                  >
                    Settings
                  </Link>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
