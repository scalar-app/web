'use client';

import { Button } from '@scalar/ui';

export function ErrorNotice({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-border px-4 py-3 text-[13px]">
      <p className="text-primary">{title}</p>
      <p className="mt-1 text-secondary">Your existing data is still available.</p>
      {onRetry ? (
        <div className="mt-3">
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
