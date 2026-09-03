'use client';

import { Button, Panel } from '@scalar/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { scalar } from '@/lib/api';

/**
 * Taking your data out.
 *
 * Scalar's claim is that a self-hosted install means the data is yours, and that claim is only
 * worth anything if there is a button. So this downloads the whole thing -- tasks, events, spaces,
 * focus history, assistant conversations, connected accounts -- as one JSON file, and the file says
 * inside itself what it contains and what was deliberately left out.
 *
 * It is not a backup you can restore by uploading. It is the data, in a format anything can read,
 * which is the part that stops an install from being a place your history is trapped.
 */

/** Hands the finished file to the browser, then releases it. */
function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the save in some browsers; a tick is enough and the object is
  // freed either way when the document goes.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function DataExport() {
  const [savedAs, setSavedAs] = useState<string | null>(null);

  const download = useMutation({
    mutationFn: async () => {
      const file = await scalar.dataExport.download();
      // The browser cannot stream to disk without the File System Access API, which is not
      // everywhere, so the body is read here. The server still streams it, which is what keeps the
      // server's memory flat no matter how long someone has been using Scalar.
      save(await file.response.blob(), file.filename);
      return file.filename;
    },
    onSuccess: (filename) => setSavedAs(filename),
  });

  return (
    <Panel title="Your data">
      <p className="text-[13px] text-secondary">
        Download everything in this workspace as one JSON file: tasks, events, spaces and projects,
        focus sessions, assistant conversations, and which accounts are connected.
      </p>
      <p className="mt-2 text-[13px] text-secondary">
        Sign-in sessions and the access tokens for connected accounts are not included. A token in a
        file in your downloads folder is a working key to that account, and reconnecting takes one
        click.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          loading={download.isPending}
          onClick={() => download.mutate()}
        >
          Download my data
        </Button>
        {savedAs && !download.isPending ? (
          <span className="text-[12px] text-muted">Saved as {savedAs}</span>
        ) : null}
      </div>
      {download.isError ? (
        <div className="mt-4">
          <ErrorNotice
            title="The export could not be downloaded."
            onRetry={() => download.mutate()}
          />
        </div>
      ) : null}
    </Panel>
  );
}
