'use client';

import { cx, Kbd } from '@scalar/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../Logo';
import { primaryNav, settingsNav, type NavItem } from './navigation';

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
        active ? 'bg-raised text-primary' : 'text-secondary hover:bg-surface hover:text-primary',
      )}
    >
      <span
        aria-hidden="true"
        className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-yellow' : 'bg-transparent')}
      />
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

export function Sidebar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <nav aria-label="Account" className="mt-4 border-t border-border pt-3">
        <NavLink item={settingsNav} active={isActive(settingsNav.href)} />
      </nav>
    </aside>
  );
}
