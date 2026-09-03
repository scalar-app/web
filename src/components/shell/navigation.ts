import {
  Bell,
  Calendar,
  Inbox,
  LayoutGrid,
  Search,
  Settings,
  Sparkles,
  SquareCheck,
  Sun,
  Timer,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  /** Single key hotkey (pressed after `g`) for keyboard navigation. */
  key: string;
}

export const primaryNav: readonly NavItem[] = [
  { href: '/today', label: 'Today', icon: Sun, key: 't' },
  { href: '/ask', label: 'Ask', icon: Sparkles, key: 'a' },
  { href: '/focus', label: 'Focus', icon: Timer, key: 'f' },
  { href: '/inbox', label: 'Inbox', icon: Inbox, key: 'i' },
  { href: '/tasks', label: 'Tasks', icon: SquareCheck, key: 'k' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, key: 'c' },
  { href: '/spaces', label: 'Spaces', icon: LayoutGrid, key: 'p' },
  { href: '/search', label: 'Search', icon: Search, key: 's' },
];

/**
 * Not in the primary rail. What happened while you were away is a place you go once and clear,
 * not one of the eight screens Scalar is made of, and putting it up there would push Today,
 * Inbox and Tasks down for something that is empty most days.
 */
export const notificationsNav: NavItem = {
  href: '/notifications',
  label: 'Notifications',
  icon: Bell,
  key: 'n',
};

export const settingsNav: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: Settings,
  key: ',',
};
