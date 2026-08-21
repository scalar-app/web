'use client';

import { Button } from '@scalar/ui';

export function ErrorNotice({
  title,
  /**
   * The reassurance under the title. The default suits one panel failing inside a page that is
   * otherwise fine; pass something else where that is not true, and null where nothing reassuring
   * can honestly be said.
   */
  description = 'Your existing data is still available.',
  onRetry,
}: {
  title: string;
  description?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-md border border-border px-4 py-3 text-[13px]">
      <p className="text-primary">{title}</p>
      {description ? <p className="mt-1 text-secondary">{description}</p> : null}
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
