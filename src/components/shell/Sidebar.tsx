'use client';

import { cx, Kbd } from '@scalar/ui';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '../Logo';
import { useSession, useLogout } from '@/lib/queries/auth';
import { useTasks } from '@/lib/queries/tasks';
import { primaryNav, settingsNav, type NavItem } from './navigation';
import { useGoToNavigation } from './useGoToNavigation';

function NavLink({
  item,
  active,
  showKey,
  badge,
}: {
  item: NavItem;
  active: boolean;
  showKey: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group relative flex items-center gap-3 rounded-md py-2 pr-2 pl-3 text-[13px] transition-colors',
        active ? 'bg-raised text-primary' : 'text-secondary hover:bg-surface hover:text-primary',
      )}
    >
      {/* A bar rather than a dot: it reads as the edge of the selected row instead of a bullet
          that could be mistaken for a status light. */}
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full transition-colors',
          active ? 'bg-yellow' : 'bg-transparent',
        )}
      />
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>

      {badge !== undefined && badge > 0 ? (
        <span
          className="min-w-5 rounded-full bg-surface px-1.5 text-center font-mono text-[11px] text-secondary tabular-nums group-hover:bg-raised"
          aria-label={`${String(badge)} waiting`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}

      {/* Only while `g` is armed, so the sidebar is quiet until the shortcut is in play. */}
      {showKey ? <Kbd>{item.key}</Kbd> : null}
    </Link>
  );
}

export function Sidebar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const armed = useGoToNavigation();
  const session = useSession();

  // Only what still needs triage, which is the number worth putting in front of somebody.
  const inbox = useTasks({ status: ['inbox'], limit: 100 });
  const waiting = inbox.data?.data.length ?? 0;

  const logout = useLogout({ onSettled: () => router.replace('/login') });

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const email = session.status === 'signed-in' ? session.user.email : null;

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border bg-background px-3 py-4 md:flex">
      <div className="mb-6 px-3">
        <Logo />
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        className="mb-4 flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left text-[13px] text-secondary transition-colors hover:border-muted hover:text-primary"
      >
        <span>Command</span>
        <span className="flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5">
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            showKey={armed}
            {...(item.href === '/inbox' ? { badge: waiting } : {})}
          />
        ))}
      </nav>

      <div className="mt-4 border-t border-border pt-3">
        <nav aria-label="Account" className="flex flex-col gap-0.5">
          <NavLink item={settingsNav} active={isActive(settingsNav.href)} showKey={armed} />
        </nav>

        {email ? (
          <div className="mt-2 flex items-center gap-2 rounded-md px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-muted" title={email}>
              {email}
            </span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Sign out"
              title="Sign out"
              className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-primary"
            >
              <LogOut size={14} aria-hidden />
            </button>
          </div>
        ) : null}

        {/* Says the shortcut exists without spelling out seven of them. */}
        <p className="px-3 pt-1 text-[11px] text-muted">
          Press <Kbd>g</Kbd> then a letter to jump
        </p>
      </div>
    </aside>
  );
}
