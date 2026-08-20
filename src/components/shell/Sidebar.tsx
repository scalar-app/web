'use client';

import { cx, Kbd, useHotkey } from '@scalar/ui';
import { Command, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '../Logo';
import { useSession, useLogout } from '@/lib/queries/auth';
import { useTasks } from '@/lib/queries/tasks';
import { primaryNav, settingsNav, type NavItem } from './navigation';
import { useGoToNavigation } from './useGoToNavigation';
import { useSidebarCollapsed } from './useSidebarCollapsed';

function NavLink({
  item,
  active,
  showKey,
  collapsed,
  badge,
}: {
  item: NavItem;
  active: boolean;
  showKey: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  const waiting = badge !== undefined && badge > 0;
  const name = waiting ? `${item.label}, ${String(badge)} waiting` : item.label;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      // Collapsed there is no visible text, so the row has to say what it is some other way: a
      // name for assistive technology and a tooltip for everybody else.
      aria-label={collapsed ? name : undefined}
      title={collapsed ? item.label : undefined}
      className={cx(
        'group relative flex items-center rounded-md py-2 text-[13px] transition-colors',
        collapsed ? 'justify-center px-0' : 'gap-3 pr-2 pl-3',
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

      <span className="relative flex shrink-0 items-center">
        <Icon size={16} strokeWidth={1.75} aria-hidden />
        {/* Collapsed there is no room for a count, so the dot says only that something is
            waiting. The number itself stays in the accessible name above. */}
        {collapsed && waiting ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-yellow"
          />
        ) : null}
      </span>

      {collapsed ? null : (
        <>
          <span className="flex-1 truncate">{item.label}</span>

          {waiting ? (
            <span
              className="min-w-5 rounded-full bg-surface px-1.5 text-center font-mono text-[11px] text-secondary tabular-nums group-hover:bg-raised"
              aria-label={`${String(badge)} waiting`}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}

          {/* Only while `g` is armed, so the sidebar is quiet until the shortcut is in play. */}
          {showKey ? <Kbd>{item.key}</Kbd> : null}
        </>
      )}
    </Link>
  );
}

export function Sidebar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const armed = useGoToNavigation();
  const session = useSession();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  // The combo most editors use for the same panel. Not `allowInInputs`: somebody writing a task
  // title should not have the navigation move out from under them mid sentence.
  useHotkey('mod+\\', toggleCollapsed);

  // Only what still needs triage, which is the number worth putting in front of somebody.
  const inbox = useTasks({ status: ['inbox'], limit: 100 });
  const waiting = inbox.data?.data.length ?? 0;

  const logout = useLogout({ onSettled: () => router.replace('/login') });

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const email = session.status === 'signed-in' ? session.user.email : null;

  return (
    <aside
      id="sidebar"
      className={cx(
        'hidden h-full shrink-0 flex-col border-r border-border bg-background py-4 transition-[width] duration-150 md:flex',
        collapsed ? 'w-14 px-2' : 'w-56 px-3',
      )}
    >
      <div className={cx('mb-6 flex', collapsed ? 'justify-center' : 'px-3')}>
        <Logo wordmark={!collapsed} />
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        aria-label={collapsed ? 'Command' : undefined}
        title={collapsed ? 'Command' : undefined}
        className={cx(
          'mb-4 flex items-center rounded-md border border-border bg-surface py-2 text-left text-[13px] text-secondary transition-colors hover:border-muted hover:text-primary',
          collapsed ? 'justify-center px-0' : 'justify-between px-3',
        )}
      >
        {collapsed ? (
          // The command mark, not a magnifier: Search is a destination further down the same rail,
          // and two identical icons a few rows apart is a coin flip rather than a choice.
          <Command size={16} strokeWidth={1.75} aria-hidden />
        ) : (
          <>
            <span>Command</span>
            <span className="flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </>
        )}
      </button>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5">
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            showKey={armed}
            collapsed={collapsed}
            {...(item.href === '/inbox' ? { badge: waiting } : {})}
          />
        ))}
      </nav>

      <div className="mt-4 border-t border-border pt-3">
        <nav aria-label="Account" className="flex flex-col gap-0.5">
          <NavLink
            item={settingsNav}
            active={isActive(settingsNav.href)}
            showKey={armed}
            collapsed={collapsed}
          />
        </nav>

        {email ? (
          <div
            className={cx(
              'mt-2 flex items-center rounded-md py-2',
              collapsed ? 'justify-center' : 'gap-2 px-3',
            )}
          >
            {collapsed ? null : (
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted" title={email}>
                {email}
              </span>
            )}
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Sign out"
              // Collapsed the address is not on screen, so the tooltip carries whose session it is.
              title={collapsed ? `Sign out (${email})` : 'Sign out'}
              className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-primary"
            >
              <LogOut size={14} aria-hidden />
            </button>
          </div>
        ) : null}

        {/* Says the shortcut exists without spelling out seven of them. */}
        {collapsed ? null : (
          <p className="px-3 pt-1 text-[11px] text-muted">
            Press <Kbd>g</Kbd> then a letter to jump
          </p>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="sidebar"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          // `w-full` because a button shrink wraps even as a flex container, and this one is not
          // in a flex parent the way the rest of the rail is. Without it `justify-center` centers
          // the icon inside a box only as wide as the icon, which parks it against the left edge.
          className={cx(
            'mt-2 flex w-full items-center rounded-md py-2 text-[13px] text-secondary transition-colors hover:bg-surface hover:text-primary',
            collapsed ? 'justify-center px-0' : 'gap-3 pr-2 pl-3',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden />
          )}
          {collapsed ? null : (
            <>
              <span className="flex-1 truncate text-left">Collapse</span>
              {/* Named the same way the Command button names its own shortcut. */}
              <span className="flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>\</Kbd>
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
