'use client';

import type { GoogleProvider, IntegrationAccount, SyncResource } from '@scalar/sdk';
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
import { ConnectCanvas } from '@/components/integrations/ConnectCanvas';
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
  gmail: 'Gmail',
};

/**
 * What a provider actually imported, for the sentence a person reads before deciding whether to
 * keep it. Calling a starred email an "event" in the disconnect dialog would be describing rows
 * that do not exist.
 */
const providerNoun: Record<IntegrationAccount['provider'], string> = {
  google_calendar: 'events',
  canvas: 'assignments',
  gmail: 'messages',
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
  const noun = providerNoun[account.provider];
  const googleProvider: GoogleProvider | null =
    account.provider === 'google_calendar' || account.provider === 'gmail'
      ? account.provider
      : null;

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
              onClick={() => {
                // Canvas reconnects by pasting a new token, not by a redirect, so there is nothing
                // for this button to start.
                if (googleProvider) connect.mutate(googleProvider);
              }}
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
            {`Access was revoked, so syncing has stopped. Reconnect to resume. Imported ${noun} stay where they are.`}
          </p>
        ) : null}
        <ul className="flex flex-col">
          {account.resources.map((resource) => (
            <ResourceRow key={resource.resourceId} resource={resource} />
          ))}
        </ul>
        {sync.isError ? (
          <p role="alert" className="text-[13px] text-danger">
            Could not start a sync. Try again.
          </p>
        ) : null}
      </Stack>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Disconnect ${providerLabel[account.provider]}?`}
        description={`Scalar will stop syncing this account. Choose what happens to the ${noun} it already imported.`}
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
              {`Keep ${noun}`}
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
              {`Delete ${noun}`}
            </Button>
          </Inline>
        }
      >
        <p className="m-0 text-[13px] text-secondary">
          {`Keeping them leaves the ${noun} in Scalar without a link to the account they came from. Deleting removes every one that came from it.`}
        </p>
        {/* Without this the dialog just sits there with the spinner stopped, which reads as though
            the disconnect worked. Revoking access failing silently is the wrong way round. */}
        {disconnect.isError ? (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            Could not disconnect. Nothing was changed. Try again.
          </p>
        ) : null}
      </Dialog>
    </Panel>
  );
}

const callbackMessage: Record<string, string> = {
  denied: 'Access was not granted, so nothing was connected.',
  error: 'The account could not be connected. Try again.',
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
            <Button
              variant="primary"
              loading={connect.isPending}
              onClick={() => connect.mutate('google_calendar')}
            >
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

      {/* Gmail is its own consent, so it is its own button: connecting a calendar must never ask
          anyone for their mail. Only offered while there is no Gmail account, the same rule the
          Canvas form follows. */}
      {integrations.isSuccess && !integrations.data.some((a) => a.provider === 'gmail') ? (
        <div className="mt-6">
          <Panel title="Gmail">
            <Stack gap={3}>
              <p className="m-0 text-[13px] text-secondary">
                Starred messages arrive in your Inbox as work to decide on. Scalar reads message
                headers and Gmail&rsquo;s own preview line, never the body, and never sends mail.
              </p>
              <Inline gap={2}>
                <Button
                  variant="primary"
                  loading={connect.isPending}
                  onClick={() => connect.mutate('gmail')}
                >
                  Connect Gmail
                </Button>
              </Inline>
            </Stack>
          </Panel>
        </div>
      ) : null}

      {/* Canvas connects with a token rather than a redirect, so it needs a form rather than a
          button, and it belongs on the page whether or not anything is connected yet. */}
      {integrations.isSuccess &&
      !integrations.data.some((account) => account.provider === 'canvas') ? (
        <div className="mt-6">
          <ConnectCanvas />
        </div>
      ) : null}

      {connect.isError ? (
        <p role="alert" className="mt-4 text-[13px] text-danger">
          Google is not configured on this server, or the request failed. Check the API logs.
        </p>
      ) : null}

      <p className="mt-8 text-[12px] text-muted">
        Scalar requests the smallest scope a feature needs, reads only, and you can disconnect at
        any time.
      </p>
    </>
  );
}
