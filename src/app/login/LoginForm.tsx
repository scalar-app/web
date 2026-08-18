'use client';

import { Button, Input } from '@scalar/ui';
import { isScalarApiError } from '@scalar/sdk';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRequestMagicLink } from '@/lib/queries/auth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const request = useRequestMagicLink();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    request.mutate(email.trim());
  }

  if (request.isSuccess) {
    return (
      <div className="text-[13px]">
        <p className="text-primary">Check your email.</p>
        <p className="mt-1 text-secondary">
          If an account exists for {email}, a sign in link is on its way.
        </p>
        {request.data.devLink ? (
          <p className="mt-4 rounded-md border border-border px-3 py-2 text-secondary">
            Development mode: email delivery is not set up, so here is your link.{' '}
            <Link
              href={request.data.devLink}
              className="text-yellow underline-offset-2 hover:underline"
            >
              Open sign in link
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  const errorMessage = request.isError
    ? isScalarApiError(request.error) && request.error.code === 'RATE_LIMITED'
      ? 'Too many attempts. Wait a few minutes and try again.'
      : 'We could not send the link. Check your connection and try again.'
    : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-[13px] text-secondary">
        Email
      </label>
      <Input
        id="email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        invalid={request.isError}
      />
      <Button type="submit" variant="primary" loading={request.isPending}>
        Send sign in link
      </Button>
      {errorMessage ? (
        <p role="alert" className="text-[13px] text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
