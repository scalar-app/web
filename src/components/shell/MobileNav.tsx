'use client';

import { cx } from '@scalar/ui';
import { Search, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../Logo';
import { useTasks } from '@/lib/queries/tasks';
import { primaryNav, settingsNav, type NavItem } from './navigation';

/**
 * Phone navigation: a title bar at the top and a tab bar at the bottom, where a thumb is.
 *
 * The tab bar carries the destinations somebody moves between constantly. The rest stay reachable
 * through Command, which is why the search button sits in the top bar rather than the tab bar.
 */

/**
 * The tab bar holds five at most; more than that and the targets get too small to hit.
 *
 * These are the five somebody moves between all day. Settings is not one of them, so it sits in
 * the top bar instead: keeping it here would have cost the place Inbox needs, and Inbox is the
 * screen that accumulates work while you are not looking.
 */
const TABS: readonly NavItem[] = [
  primaryNav[0]!, // Today
  primaryNav[2]!, // Inbox
  primaryNav[1]!, // Ask
  primaryNav[3]!, // Tasks
  primaryNav[4]!, // Calendar
];

function Tab({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      // min-h-11 keeps the target at 44px, the smallest a finger reliably hits.
      className={cx(
        'flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px]',
        active ? 'text-primary' : 'text-secondary',
      )}
    >
      <span className="relative">
        <Icon size={18} strokeWidth={1.75} aria-hidden />
        {badge !== undefined && badge > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-yellow"
          />
        ) : null}
      </span>
      <span>{item.label}</span>
      <span
        aria-hidden="true"
        className={cx('h-0.5 w-4 rounded-full', active ? 'bg-yellow' : 'bg-transparent')}
      />
    </Link>
  );
}

export function MobileTopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
      <Logo />
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Open command"
          className="flex h-11 w-11 items-center justify-center rounded-md text-secondary hover:bg-surface hover:text-primary"
        >
          <Search size={18} strokeWidth={1.75} aria-hidden />
        </button>
        <Link
          href={settingsNav.href}
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-md text-secondary hover:bg-surface hover:text-primary"
        >
          <Settings size={18} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const inbox = useTasks({ status: ['inbox'], limit: 100 });
  const waiting = inbox.data?.data.length ?? 0;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Primary"
      // The inline padding clears the home indicator on iPhones without affecting other devices.
      className="flex shrink-0 items-stretch border-t border-border bg-background md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map((item) => (
        <Tab
          key={item.href}
          item={item}
          active={isActive(item.href)}
          {...(item.href === '/inbox' ? { badge: waiting } : {})}
        />
      ))}
    </nav>
  );
}
