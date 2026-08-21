'use client';

import { Spinner, useHotkey } from '@scalar/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { isApiConfigured } from '@/lib/api';
import { useSession } from '@/lib/queries/auth';
import { CommandPalette } from './CommandPalette';
import { ImmersiveProvider, useImmersiveState } from './immersive';
import { ServerSetup } from './ServerSetup';
import { MobileTabBar, MobileTopBar } from './MobileNav';
import { Sidebar } from './Sidebar';

const subscribeToNothing = () => () => undefined;

/**
 * Authenticated shell. The API decides whether the session is valid; while it answers we show a
 * quiet loading state, and on 401 we send the user to sign in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ImmersiveProvider>
      <Shell>{children}</Shell>
    </ImmersiveProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  // The configured server lives outside React, in storage or in a value a native shell injected.
  // Reading it through useSyncExternalStore keeps the prerendered HTML and the browser agreeing:
  // the build assumes a server is configured, and the browser corrects that on hydration. It only
  // changes by way of a reload, so there is nothing to subscribe to.
  const configured = useSyncExternalStore(subscribeToNothing, isApiConfigured, () => true);

  const session = useSession();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  // Focus asks for this while a session runs. Everything else keeps the navigation.
  const immersive = useImmersiveState();

  useHotkey('mod+k', () => setCommandOpen((v) => !v), { allowInInputs: true });

  useEffect(() => {
    if (session.status === 'signed-out') router.replace('/login');
  }, [session.status, router]);

  if (!configured) return <ServerSetup />;

  // Not signed out, so not the sign in screen. Say what actually happened and offer another go.
  if (session.status === 'unreachable') {
    return (
      <div className="min-h-app flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <ErrorNotice
            title={
              session.reason === 'offline'
                ? 'No network connection.'
                : 'Cannot reach your Scalar server.'
            }
            description={
              session.reason === 'offline'
                ? 'You are still signed in. Scalar will pick up where it left off once you are back online.'
                : 'You are still signed in. Check the server is running, then try again.'
            }
            onRetry={session.retry}
          />
        </div>
      </div>
    );
  }

  if (session.status !== 'signed-in') {
    return (
      <div
        className="min-h-app flex items-center justify-center"
        aria-busy="true"
        aria-live="polite"
      >
        <Spinner size={16} />
      </div>
    );
  }

  if (immersive) {
    return (
      // Nothing but the screen itself. The command palette stays mounted because it is a keyboard
      // shortcut rather than furniture: invisible until asked for, and a way out if it is needed.
      <div className="h-app flex flex-col overflow-hidden">
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
    );
  }

  return (
    // A row on desktop with the sidebar beside the content, a column on phones with the bars
    // stacked above and below it. Only the middle scrolls, so the tab bar never drifts away.
    <div className="h-app flex flex-col overflow-hidden md:flex-row">
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
