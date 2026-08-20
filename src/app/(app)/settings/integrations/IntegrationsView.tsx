'use client';

import type { IntegrationAccount, SyncResource } from '@scalar/sdk';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Inline,
  Panel,
  Spinner,
  StatusLight,
  Stack,
} from '@scalar/ui';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import {
  useConnectGoogle,
  useDisconnectIntegration,
  useIntegrations,
  useSyncIntegration,
} from '@/lib/queries/integrations';

const providerLabel: Record<IntegrationAccount['provider'], string> = {
  google_calendar: 'Google Calendar',
  canvas: 'Canvas',
};

const statusTone: Record<SyncResource['syncStatus'], 'neutral' | 'yellow' | 'success' | 'danger'> =
  {
    idle: 'success',
    queued: 'yellow',
    running: 'yellow',
    error: 'danger',
  };

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)} h ago`;
  return `${String(Math.round(hours / 24))} d ago`;
}

function ResourceRow({ resource }: { resource: SyncResource }) {
  const busy = resource.syncStatus === 'queued' || resource.syncStatus === 'running';
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border py-2 text-[13px] last:border-b-0">
      <span className="flex items-center gap-2 truncate">
        <StatusLight tone={statusTone[resource.syncStatus]} pulse={busy} />
        <span className="truncate text-primary">
          {resource.resourceName ?? resource.resourceId}
        </span>
      </span>
      <span className="shrink-0 text-secondary">
        {resource.syncStatus === 'error'
          ? (resource.lastError ?? 'Sync failed')
          : busy
            ? 'Syncing'
            : `Synced ${relativeTime(resource.lastSuccessfulSyncAt)}`}
      </span>
    </li>
  );
}

function AccountPanel({ account }: { account: IntegrationAccount }) {
  const sync = useSyncIntegration();
  const disconnect = useDisconnectIntegration();
  const [confirming, setConfirming] = useState(false);
  const needsReauth = account.status === 'reauthorization_required';
  const connect = useConnectGoogle();

  return (
    <Panel
      title={providerLabel[account.provider]}
      actions={
        <Inline gap={2}>
          {needsReauth ? (
            <Button
              size="sm"
              variant="primary"
              loading={connect.isPending}
              onClick={() => connect.mutate()}
            >
              Reconnect
            </Button>
          ) : (
            <Button size="sm" loading={sync.isPending} onClick={() => sync.mutate(account.id)}>
              Sync now
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Disconnect
          </Button>
        </Inline>
      }
    >
      <Stack gap={3}>
        <Inline gap={2}>
          <span className="text-[13px] text-secondary">
            {account.displayName ?? 'Connected account'}
          </span>
          {needsReauth ? (
            <Badge tone="danger">Reconnect needed</Badge>
          ) : (
            <Badge tone="success">Connected</Badge>
          )}
        </Inline>
        {needsReauth ? (
          <p className="text-[13px] text-secondary">
            Google revoked access, so syncing has stopped. Reconnect to resume. Imported events stay
            where they are.
          </p>
        ) : null}
        <ul className="flex flex-col">
          {account.resources.map((resource) => (
            <ResourceRow key={resource.resourceId} resource={resource} />
          ))}
        </ul>
      </Stack>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Disconnect Google Calendar?"
        description="Scalar will revoke its access at Google and stop syncing. Choose what happens to events already imported."
        footer={
          <Inline gap={2} justify="end">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              loading={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(
                  { id: account.id, data: 'keep' },
                  { onSuccess: () => setConfirming(false) },
                )
              }
            >
              Keep events
            </Button>
            <Button
              variant="danger"
              loading={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(
                  { id: account.id, data: 'delete' },
                  { onSuccess: () => setConfirming(false) },
                )
              }
            >
              Delete events
            </Button>
          </Inline>
        }
      >
        <p className="m-0 text-[13px] text-secondary">
          Keeping them leaves the events in your calendar view without a link to Google. Deleting
          removes every event that came from this account.
        </p>
      </Dialog>
    </Panel>
  );
}

const callbackMessage: Record<string, string> = {
  denied: 'Google access was not granted, so nothing was connected.',
  error: 'Google could not be connected. Try again.',
};

export function IntegrationsView() {
  const integrations = useIntegrations();
  const connect = useConnectGoogle();
  const params = useSearchParams();
  const result = params.get('result');
  const notice =
    result && result !== 'connected' ? (callbackMessage[result] ?? callbackMessage['error']) : null;

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the services that already hold your obligations. Scalar reads only what a feature needs."
      />

      {notice ? (
        <div className="mb-6">
          <ErrorNotice title={notice} />
        </div>
      ) : null}

      {integrations.isPending ? (
        <div className="py-10 text-center" aria-busy="true">
          <Spinner size={14} />
        </div>
      ) : integrations.isError ? (
        <ErrorNotice
          title="Integrations could not be loaded."
          onRetry={() => void integrations.refetch()}
        />
      ) : integrations.data.length === 0 ? (
        <EmptyState
          title="Nothing connected yet."
          description="Connect Google Calendar to see your events in Today and Calendar. Scalar asks for read only access."
          action={
            <Button variant="primary" loading={connect.isPending} onClick={() => connect.mutate()}>
              Connect Google Calendar
            </Button>
          }
        />
      ) : (
        <Stack gap={6}>
          {integrations.data.map((account) => (
            <AccountPanel key={account.id} account={account} />
          ))}
        </Stack>
      )}

      {connect.isError ? (
        <p role="alert" className="mt-4 text-[13px] text-danger">
          Google is not configured on this server, or the request failed. Check the API logs.
        </p>
      ) : null}

      <p className="mt-8 text-[12px] text-muted">
        Gmail and Canvas are next. Scalar requests the smallest scope a feature needs and you can
        disconnect at any time.
      </p>
    </>
  );
}
