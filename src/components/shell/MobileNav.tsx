'use client';

import { cx } from '@scalar/ui';
import { Bell, Search, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/lib/queries/notifications';
import { useTasks } from '@/lib/queries/tasks';
import { notificationsNav, primaryNav, settingsNav, type NavItem } from './navigation';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

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
 *
 * By destination rather than by position in `primaryNav`. It was written as indices into that
 * array -- `primaryNav[2]` annotated `// Inbox` -- and the array's order had moved underneath it,
 * so the bar shipped Today, Focus, Ask, Inbox, Tasks: the comments described one set of five and
 * the code rendered another. Calendar, named in the comment, was on no tab at all, which on a
 * phone meant the week was reachable only by typing its name into Command.
 *
 * Nothing about a list of five off-by-one destinations looks wrong in a review, and no test could
 * see it either, because none of them asserted where the tabs went. Naming the destinations puts
 * the intent where it can be checked: the tests below assert this exact list, and a name that
 * stops existing fails loudly at load rather than quietly rendering four tabs.
 */
const TAB_HREFS = ['/today', '/inbox', '/ask', '/tasks', '/calendar'] as const;

const TABS: readonly NavItem[] = TAB_HREFS.map((href) => {
  const item = primaryNav.find((nav) => nav.href === href);
  // A destination that has been renamed or removed, caught at startup rather than by rendering
  // four tabs and a hole where the fifth was.
  if (!item) throw new Error(`Tab bar names ${href}, which is not in primaryNav.`);
  return item;
});

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

/**
 * The top bar carries the workspace, not the wordmark.
 *
 * The sidebar is hidden on a phone, and it was the only place the workspace was named. That was
 * survivable while everybody had exactly one; it stopped being survivable the day a workspace could
 * be shared, because somebody capturing a thought has to be able to see which workspace it is
 * about to land in. On a 375px bar the app's own name is the least useful thing there and the
 * workspace is the most useful, so the wordmark gives up the space.
 */
export function MobileTopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const notifications = useNotifications();
  const unread = notifications.data?.unreadCount ?? 0;
  const pathname = usePathname();

  return (
    <header
      className="flex items-center gap-1 border-b border-border bg-background px-3 py-2 md:hidden"
      // The status bar and the notch. In a browser this is 0 and nothing moves; in the packaged
      // app it is the difference between a header and a header with a clock through it.
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--sc-space-2))' }}
    >
      <WorkspaceSwitcher variant="bar" />

      <Link
        href={notificationsNav.href}
        aria-label={unread > 0 ? `Notifications, ${String(unread)} unread` : 'Notifications'}
        aria-current={pathname === notificationsNav.href ? 'page' : undefined}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface hover:text-primary"
      >
        <Bell size={18} strokeWidth={1.75} aria-hidden />
        {/* A dot rather than a number: the count is in the accessible name, and a numeral this
            small on a phone is decoration rather than information. */}
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-yellow"
          />
        ) : null}
      </Link>

      <button
        type="button"
        onClick={onOpenCommand}
        aria-label="Open command"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface hover:text-primary"
      >
        <Search size={18} strokeWidth={1.75} aria-hidden />
      </button>
      <Link
        href={settingsNav.href}
        aria-label="Settings"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface hover:text-primary"
      >
        <Settings size={18} strokeWidth={1.75} aria-hidden />
      </Link>
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
      // Left and right matter in landscape, where the notch is beside the tabs rather than above
      // them, and the home indicator is still below.
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
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
