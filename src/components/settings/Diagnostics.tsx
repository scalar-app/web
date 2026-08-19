'use client';

import type { ComponentReport, ComponentStatus } from '@scalar/sdk';
import { Button, Panel, Spinner, StatusLight } from '@scalar/ui';
import { useQuery } from '@tanstack/react-query';
import { scalar } from '@/lib/api';
import { ErrorNotice } from '@/components/ErrorNotice';

/**
 * The page a self hoster opens when something is wrong.
 *
 * Every row says what a component is doing and, when it is unhappy, what to do about it. Nothing
 * here is a number without a sentence: "worker: 0" tells someone nothing, "the worker last checked
 * in 4 hours ago, so syncs are probably stopped" tells them where to look.
 */

const TONE: Record<ComponentStatus, 'success' | 'neutral' | 'danger'> = {
  ok: 'success',
  not_configured: 'neutral',
  error: 'danger',
};

const LABELS: [key: string, label: string][] = [
  ['database', 'Database'],
  ['redis', 'Redis'],
  ['worker', 'Worker'],
  ['ai', 'AI provider'],
  ['email', 'Email'],
  ['integrations', 'Integrations'],
];

function Row({ label, report }: { label: string; report: ComponentReport }) {
  return (
    <li className="flex items-start gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0">
      <span className="pt-1">
        <StatusLight tone={TONE[report.status]} label={report.status} />
      </span>
      <span className="w-28 shrink-0 text-primary">{label}</span>
      <span className="min-w-0 flex-1 text-secondary">{report.detail}</span>
    </li>
  );
}

export function Diagnostics() {
  const diagnostics = useQuery({
    queryKey: ['diagnostics'],
    queryFn: () => scalar.diagnostics.get(),
    refetchInterval: 60_000,
  });

  return (
    <Panel title="Diagnostics">
      {diagnostics.isPending ? (
        <div className="py-4 text-center" aria-busy="true">
          <Spinner size={14} />
        </div>
      ) : diagnostics.isError ? (
        <ErrorNotice
          title="This server could not be checked."
          onRetry={() => void diagnostics.refetch()}
        />
      ) : (
        <>
          <ul className="flex flex-col">
            {LABELS.map(([key, label]) => (
              <Row
                key={key}
                label={label}
                report={
                  diagnostics.data.components[key as keyof typeof diagnostics.data.components]
                }
              />
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-2 text-[13px]">
            <dt className="text-secondary">Version</dt>
            <dd className="text-primary">{diagnostics.data.version}</dd>
            <dt className="text-secondary">Schema</dt>
            <dd className="text-primary">{diagnostics.data.schemaVersion} migrations applied</dd>
          </dl>
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              loading={diagnostics.isFetching}
              onClick={() => void diagnostics.refetch()}
            >
              Check again
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}
