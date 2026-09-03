'use client';

import { Button, Panel } from '@scalar/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { AiStatus } from '@/components/settings/AiStatus';
import { DataExport } from '@/components/settings/DataExport';
import { Diagnostics } from '@/components/settings/Diagnostics';
import { PlanningSettings } from '@/components/settings/PlanningSettings';
import { apiUrl } from '@/lib/api';
import { useLogout, useSession } from '@/lib/queries/auth';

export function SettingsView() {
  const session = useSession();
  const router = useRouter();
  const logout = useLogout({ onSettled: () => router.replace('/login') });

  return (
    <>
      <PageHeader title="Settings" />
      <Panel title="Account">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-[13px]">
          <dt className="text-secondary">Email</dt>
          <dd className="text-primary">
            {session.status === 'signed-in' ? session.user.email : ''}
          </dd>
          <dt className="text-secondary">Session</dt>
          <dd className="text-primary">Signed in with a magic link.</dd>
        </dl>
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            loading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Sign out
          </Button>
        </div>
      </Panel>
      <div className="mt-6">
        <PlanningSettings />
      </div>
      <div className="mt-6">
        <AiStatus />
      </div>
      <div className="mt-6">
        <Panel title="Workspace">
          <p className="text-[13px] text-secondary">
            Who is in this workspace, and who may invite or remove people.
          </p>
          <div className="mt-4">
            <Link
              href="/settings/workspace"
              className="sc-button sc-button--secondary sc-button--sm"
            >
              Manage workspace
            </Link>
          </div>
        </Panel>
      </div>
      <div className="mt-6">
        <Panel title="Integrations">
          <p className="text-[13px] text-secondary">
            Connect Google Calendar so your events appear in Today and Calendar.
          </p>
          <div className="mt-4">
            <Link
              href="/settings/integrations"
              className="sc-button sc-button--secondary sc-button--sm"
            >
              Manage integrations
            </Link>
          </div>
        </Panel>
      </div>
      <div className="mt-6">
        <DataExport />
      </div>
      <div className="mt-6">
        <Diagnostics />
      </div>
      <div className="mt-6">
        <Panel title="About">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-[13px]">
            <dt className="text-secondary">Licence</dt>
            <dd className="text-primary">AGPL-3.0</dd>
            <dt className="text-secondary">Server</dt>
            <dd className="truncate text-primary" title={apiUrl()}>
              {apiUrl()}
            </dd>
          </dl>
          <p className="mt-4 text-[13px] text-secondary">
            Scalar is self-hosted and open source. This is the server this install talks to, and the
            source for every part of it is public.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {/* In the desktop app these open in the system browser rather than replacing the
                window, which is what the shell's navigation handling is for. */}
            <a
              href="https://github.com/scalar-app"
              rel="noreferrer"
              className="sc-button sc-button--secondary sc-button--sm"
            >
              Source on GitHub
            </a>
            <a
              href="https://github.com/scalar-app/docs"
              rel="noreferrer"
              className="sc-button sc-button--secondary sc-button--sm"
            >
              Documentation
            </a>
          </div>
        </Panel>
      </div>

      <p className="mt-6 text-[12px] text-muted">
        Notifications will appear here as they are built.
      </p>
    </>
  );
}
