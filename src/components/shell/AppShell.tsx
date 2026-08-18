'use client';

import { Spinner, useHotkey } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/queries/auth';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';

/**
 * Authenticated shell. The API decides whether the session is valid; while it answers we show a
 * quiet loading state, and on 401 we send the user to sign in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);

  useHotkey('mod+k', () => setCommandOpen((v) => !v), { allowInInputs: true });

  useEffect(() => {
    if (session.status === 'signed-out') router.replace('/login');
  }, [session.status, router]);

  if (session.status !== 'signed-in') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        aria-busy="true"
        aria-live="polite"
      >
        <Spinner size={16} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onOpenCommand={() => setCommandOpen(true)} />
      <main id="main" className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-10">{children}</div>
      </main>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
