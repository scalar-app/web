'use client';

import type { PlanPreview as PlanPreviewData } from '@scalar/sdk';
import { Button, Spinner } from '@scalar/ui';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { AttentionList } from '@/components/home/AttentionList';
import { UpNextCard } from '@/components/home/UpNextCard';
import { PlanPreview } from '@/components/planner/PlanPreview';
import { Timeline } from '@/components/timeline/Timeline';
import { useHome } from '@/lib/queries/home';
import { usePreviewPlan } from '@/lib/queries/planner';
import { useTimeline } from '@/lib/queries/timeline';
import { formatLongDay } from '@/lib/time';

/**
 * Home.
 *
 * The order is the argument: what to do next, then what needs a decision, then the day itself.
 * Someone who reads only the first two lines should already know where they stand.
 *
 * Two queries rather than one, and they fail independently: a calendar problem should not take
 * "what should I be doing" down with it.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      <div className="border-t border-border" />
      {children}
    </section>
  );
}

function attentionSentence(count: number): string {
  if (count === 0) return 'Nothing needs your attention right now.';
  if (count === 1) return '1 thing needs your attention.';
  return `${String(count)} things need your attention.`;
}

export function TodayView() {
  const home = useHome();
  const timeline = useTimeline();
  const previewPlan = usePreviewPlan();
  const [proposed, setProposed] = useState<PlanPreviewData | null>(null);

  async function planMyDay(): Promise<void> {
    try {
      setProposed(await previewPlan.mutateAsync({}));
    } catch {
      /* shown through previewPlan.isError */
    }
  }

  if (home.isPending) {
    return (
      <div className="py-10 text-center" aria-busy="true">
        <Spinner size={14} />
      </div>
    );
  }
  if (home.isError) {
    return <ErrorNotice title="Home could not be loaded." onRetry={() => void home.refetch()} />;
  }

  const data = home.data;
  const now = new Date();
  const emptyTimeline = timeline.isSuccess && timeline.data.blocks.length === 0;

  return (
    <>
      <header className="mb-10">
        <p className="text-xl font-semibold tracking-tight">{data.greeting}</p>
        <p className="mt-1 text-[13px] text-secondary">{formatLongDay(now)}</p>
        <p className="mt-4 text-[13px] text-primary">{attentionSentence(data.attention.length)}</p>
      </header>

      <UpNextCard upNext={data.upNext} />

      <AttentionList items={data.attention} />

      {proposed ? (
        <div className="mb-10">
          <PlanPreview
            plan={proposed}
            onApplied={() => {
              setProposed(null);
            }}
            onCancel={() => {
              setProposed(null);
            }}
          />
        </div>
      ) : null}

      <Section title="Today">
        {timeline.isPending ? (
          <div className="py-6 text-center" aria-busy="true">
            <Spinner size={14} />
          </div>
        ) : timeline.isError ? (
          <ErrorNotice
            title="Your day could not be loaded."
            onRetry={() => void timeline.refetch()}
          />
        ) : (
          <Timeline data={timeline.data} now={now} />
        )}
      </Section>

      {!proposed ? (
        <div className="mb-10 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            loading={previewPlan.isPending}
            onClick={() => void planMyDay()}
          >
            Plan my day
          </Button>
          {previewPlan.isError ? (
            <span className="text-[12px] text-muted" role="alert">
              A plan could not be worked out right now.
            </span>
          ) : null}
        </div>
      ) : null}

      {data.attention.length === 0 && emptyTimeline ? (
        <p className="text-[13px] text-muted">
          <Link
            href="/settings/integrations"
            className="text-secondary underline-offset-2 hover:text-primary"
          >
            Connect a calendar
          </Link>{' '}
          to see your events here too.
        </p>
      ) : null}
    </>
  );
}
