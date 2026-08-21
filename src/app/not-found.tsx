import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <main className="min-h-app flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo size={20} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">There is nothing here.</h1>
        <p className="mt-1 text-[13px] text-secondary">
          That address does not match a screen in Scalar.
        </p>
        <p className="mt-6 text-[13px]">
          <Link
            href="/today"
            className="underline decoration-border underline-offset-4 hover:decoration-yellow"
          >
            Go to Today
          </Link>
        </p>
      </div>
    </main>
  );
}
