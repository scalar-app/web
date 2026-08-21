'use client';

import { Button, Input } from '@scalar/ui';
import { useState, type FormEvent } from 'react';
import { Logo } from '../Logo';
import { setApiUrl } from '@/lib/api';

/**
 * Asks which Scalar server this install talks to.
 *
 * A browser deployment never sees this: the server is baked in at build time by whoever put the
 * app up. A packaged desktop or mobile build always sees it once, because Scalar is self-hosted and
 * there is no default server to guess. That is the honest consequence of there being no hosted
 * Scalar, so it is a first run step rather than an error.
 */
export function ServerSetup() {
  const [value, setValue] = useState('http://localhost:4000');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setError('That is not a web address. It looks like http://localhost:4000');
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setError('The address has to start with http:// or https://');
      return;
    }

    setApiUrl(parsed.origin);
    // A full reload is the simplest way to rebuild every query against the new server.
    window.location.reload();
  }

  return (
    <div className="min-h-app flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Connect to your Scalar</h1>
        <p className="mt-1 text-[13px] text-secondary">
          Scalar runs on your own machine or server. Enter the address of the API you are running.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder="http://localhost:4000"
            aria-label="Server address"
            autoComplete="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
          />
          {error ? (
            <p role="alert" className="text-[12px] text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="min-h-11">
            Connect
          </Button>
        </form>

        <p className="mt-6 text-[12px] text-muted">
          Not running one yet? The api repository has a docker compose file and a short setup guide.
        </p>
      </div>
    </div>
  );
}
