'use client';

import { Button, Panel } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
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
      <p className="mt-6 text-[12px] text-muted">
        Integrations, notifications, usage modes and data export will appear here as they are built.
      </p>
    </>
  );
}
