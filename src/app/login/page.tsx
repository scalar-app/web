import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="min-h-app flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo size={20} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13px] text-secondary">We will email you a link. No password.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
