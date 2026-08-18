'use client';

import { Spinner } from '@scalar/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useVerifyMagicLink } from '@/lib/queries/auth';

export function VerifyClient() {
  const params = useSearchParams();
  const router = useRouter();
  const verify = useVerifyMagicLink({ onSuccess: () => router.replace('/today') });
  const token = params.get('token');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate(token);
  }, [token, verify]);

  if (!token || verify.isError) {
    return (
      <div className="w-full max-w-sm text-[13px]">
        <p className="text-primary">This sign in link is invalid or has expired.</p>
        <p className="mt-1 text-secondary">Links work once and expire after a few minutes.</p>
        <div className="mt-4">
          <Link href="/login" className="sc-button sc-button--primary sc-button--md">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-[13px] text-secondary" aria-live="polite">
      <Spinner size={14} /> Signing you in
    </div>
  );
}
