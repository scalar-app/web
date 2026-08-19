'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { primaryNav, settingsNav, type NavItem } from './navigation';

/** How long the `g` prefix stays armed before it is forgotten. */
const SEQUENCE_TIMEOUT = 1200;

const all: readonly NavItem[] = [...primaryNav, settingsNav];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * `g` then a letter jumps between screens, the convention most keyboard driven apps use.
 *
 * Every nav item already declared the letter it answers to and nothing ever listened for it, so
 * the sidebar was advertising a shortcut that did nothing. This is that listener.
 *
 * Returns whether the prefix is currently armed, so the sidebar can show what pressing a letter
 * would now do rather than leaving the reader guessing.
 */
export function useGoToNavigation(): boolean {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const disarm = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setArmed(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // Never steal a keystroke from someone writing, and never from a shortcut that has a
      // modifier, which belongs to the browser or the operating system.
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (!armed) {
        if (event.key.toLowerCase() !== 'g') return;
        setArmed(true);
        timer.current = setTimeout(disarm, SEQUENCE_TIMEOUT);
        return;
      }

      const pressed = event.key.toLowerCase();
      const destination = all.find((item) => item.key === pressed);
      disarm();
      if (!destination) return;
      event.preventDefault();
      router.push(destination.href);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [armed, router]);

  return armed;
}
