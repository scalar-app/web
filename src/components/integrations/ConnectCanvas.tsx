'use client';

import { Button, Input, Panel } from '@scalar/ui';
import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useConnectCanvas } from '@/lib/queries/integrations';

/**
 * Connecting Canvas.
 *
 * Canvas uses a token the person generates in their own Canvas settings rather than OAuth,
 * because Canvas OAuth needs a developer key only an institution's administrator can issue. A
 * student cannot get one, so asking for a token is the difference between this working and not.
 *
 * The token is sent once and never comes back: no endpoint returns it, and this form does not
 * keep it after the request.
 */
export function ConnectCanvas() {
  const connect = useConnectCanvas();
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');

  const ready = baseUrl.trim().length > 0 && token.trim().length >= 10;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!ready) return;
    connect.mutate(
      { baseUrl: baseUrl.trim(), accessToken: token.trim() },
      {
        onSuccess: () => {
          setToken('');
        },
      },
    );
  }

  return (
    <Panel title="Canvas">
      <p className="text-[13px] text-secondary">
        Assignments arrive in your inbox with what Canvas thinks they are worth, for you to accept
        or change. Scalar only reads; it never submits work.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-[13px] text-primary">Your institution&rsquo;s Canvas</span>
          <Input
            type="url"
            size="sm"
            placeholder="https://canvas.your-school.edu"
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
            }}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[13px] text-primary">Access token</span>
          <Input
            type="password"
            size="sm"
            autoComplete="off"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
            }}
          />
          <span className="text-[12px] text-muted">
            In Canvas: Account, then Settings, then &ldquo;+ New access token&rdquo;. It is stored
            encrypted on your own server and is never shown again.
          </span>
        </label>

        {connect.isError ? (
          <ErrorNotice title="Canvas did not accept that. Check the address and the token." />
        ) : null}
        {connect.isSuccess ? (
          <p className="text-[13px] text-secondary" role="status">
            Connected. Your courses are syncing; assignments will appear in your inbox.
          </p>
        ) : null}

        <div>
          <Button type="submit" size="sm" disabled={!ready} loading={connect.isPending}>
            Connect Canvas
          </Button>
        </div>
      </form>
    </Panel>
  );
}
