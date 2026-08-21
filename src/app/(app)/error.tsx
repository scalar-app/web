'use client';

import { Button } from '@scalar/ui';
import { useEffect } from 'react';

/**
 * The last stop for a render that threw inside the signed in app.
 *
 * Next replaces the routed screen with this and keeps the shell around it, so the sidebar and the
 * command palette still work and there is a way out that is not the back button. The message says
 * nothing about what went wrong: `error.message` is the server's or the bundler's words, not
 * anyone's, and in production it is a digest anyway.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // `retry`, not `reset`: it re-fetches as well as re-rendering, which is what a screen that
  // failed on its data actually needs. `reset` only re-renders the children.
  retry: () => void;
}) {
  useEffect(() => {
    // Nothing reports errors anywhere yet, so the console is the only place this exists.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div role="alert" className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight text-primary">This screen broke.</h1>
        <p className="mt-2 text-[13px] text-secondary">
          Nothing was lost. Try it again, and if it keeps happening the details are in the browser
          console.
        </p>
        {error.digest ? <p className="mt-2 text-xs text-muted">Reference {error.digest}</p> : null}
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
