'use client';

import type { Notification } from '@scalar/sdk';
import { Button, EmptyState, Spinner } from '@scalar/ui';
import { AlertTriangle, Inbox } from 'lucide-react';
import Link from 'next/link';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PageHeader } from '@/components/PageHeader';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/queries/notifications';
import { describeWhen } from '@/lib/time';

/**
 * What happened while you were away.
 *
 * Deliberately not the same list as Today's attention panel. That one is computed from what is
 * true right now, so a conflict you have resolved stops being mentioned and nothing there can be
 * marked read. This is the other half: a sync at four in the morning put eleven assignments in the
 * Inbox, and by the time anybody looks there is nothing wrong to notice.
 *
 * It is a page rather than a popover on purpose. A popover is a second, worse place to read
 * something, it cannot be linked to or reached on a phone without a separate design, and building
 * one that handles focus and dismissal properly is more work than this feature is asking for.
 */

const ICONS = {
  integration_reauthorization_required: AlertTriangle,
  integration_items_imported: Inbox,
} as const;

function Row({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const Icon = ICONS[notification.kind];
  const unread = notification.readAt === null;

  const body = (
    <>
      <span className="pt-0.5">
        <Icon
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className={unread ? 'text-yellow' : 'text-muted'}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-primary">{notification.title}</span>
        <span className="mt-0.5 block text-[12px] text-secondary">{notification.body}</span>
        <span className="mt-1 block text-[11px] text-muted">
          {describeWhen(notification.occurredAt)}
        </span>
      </span>
    </>
  );

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-start gap-3 py-3">
        {notification.href ? (
          // Reading a notification is going to look at the thing it is about, so following the
          // link is what marks it read. Nobody should have to tidy up after being told something.
          <Link
            href={notification.href}
            onClick={() => {
              if (unread) markRead.mutate(notification.id);
            }}
            className="flex min-w-0 flex-1 items-start gap-3 rounded-md px-2 py-1 -mx-2 transition-colors hover:bg-surface"
          >
            {body}
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-start gap-3 px-2 py-1 -mx-2">{body}</span>
        )}

        {unread ? (
          <Button
            variant="ghost"
            size="sm"
            loading={markRead.isPending}
            onClick={() => markRead.mutate(notification.id)}
          >
            Mark read
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function NotificationsView() {
  const notifications = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const unread = notifications.data?.unreadCount ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          ) : null
        }
      />

      {notifications.isPending ? (
        <div className="py-8 text-center" aria-busy="true">
          <Spinner size={16} />
        </div>
      ) : notifications.isError ? (
        <ErrorNotice
          title="Notifications could not be loaded."
          onRetry={() => void notifications.refetch()}
        />
      ) : notifications.data.data.length === 0 ? (
        <EmptyState
          title="Nothing has happened while you were away."
          description="Scalar tells you when something arrived or a connection stopped working. What needs you right now is on Today."
        />
      ) : (
        <ul>
          {notifications.data.data.map((notification) => (
            <Row key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </>
  );
}
