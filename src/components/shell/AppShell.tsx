'use client';

import { Spinner, useHotkey } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/queries/auth';
import { CommandPalette } from './CommandPalette';
import { MobileTabBar, MobileTopBar } from './MobileNav';
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
    // A row on desktop with the sidebar beside the content, a column on phones with the bars
    // stacked above and below it. Only the middle scrolls, so the tab bar never drifts away.
    <div className="flex h-[100dvh] flex-col overflow-hidden md:flex-row">
      <MobileTopBar onOpenCommand={() => setCommandOpen(true)} />
      <Sidebar onOpenCommand={() => setCommandOpen(true)} />
      <main id="main" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
      <MobileTabBar />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
