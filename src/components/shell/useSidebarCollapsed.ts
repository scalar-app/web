'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether the desktop sidebar is collapsed to icons, remembered across reloads.
 *
 * The preference belongs to the install rather than to the page: collapsing the sidebar and then
 * reloading should not put it back, because that reads as the app forgetting a deliberate choice.
 * localStorage is the only store available, since the same source is also built as static files
 * for the desktop shell and has no server side state of its own.
 *
 * Read through `useSyncExternalStore` so the prerendered HTML and the browser agree: the build has
 * no storage to read, so it describes an expanded sidebar and the browser corrects that on
 * hydration, the same bargain the shell already makes for the configured server.
 */

const STORAGE_KEY = 'scalar.sidebarCollapsed';

/**
 * Only used when storage refused the write. Private modes and locked down webviews can do that,
 * and a sidebar that will not collapse at all is a worse answer than one that forgets on reload.
 */
let fallback: boolean | null = null;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Another window of the same install changed the preference. `storage` never fires in the window
 * that wrote the value, so this only ever reacts to somebody else's change. A null key means
 * storage was cleared wholesale, which still concerns us.
 */
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  fallback = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/**
 * Storage is read on every call rather than cached: the result is a boolean, so React compares it
 * by value and a repeated read is as stable as a cached one, without a copy that can go stale.
 */
function getSnapshot(): boolean {
  if (fallback !== null) return fallback;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** There is no storage at build time, so a prerender always describes an expanded sidebar. */
function getServerSnapshot(): boolean {
  return false;
}

function setCollapsed(next: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    fallback = null;
  } catch {
    fallback = next;
  }
  emit();
}

/** The current state and a toggle. Reading the snapshot inside keeps the toggle identity stable. */
export function useSidebarCollapsed(): [collapsed: boolean, toggle: () => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    setCollapsed(!getSnapshot());
  }, []);
  return [collapsed, toggle];
}
