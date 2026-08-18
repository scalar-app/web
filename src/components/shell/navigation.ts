import { Calendar, Inbox, LayoutGrid, Search, Settings, SquareCheck, Sun } from 'lucide-react';
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
  { href: '/inbox', label: 'Inbox', icon: Inbox, key: 'i' },
  { href: '/tasks', label: 'Tasks', icon: SquareCheck, key: 'k' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, key: 'c' },
  { href: '/spaces', label: 'Spaces', icon: LayoutGrid, key: 'p' },
  { href: '/search', label: 'Search', icon: Search, key: 's' },
];

export const settingsNav: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: Settings,
  key: ',',
};
