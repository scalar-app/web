'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * A screen asking for the app around it to get out of the way.
 *
 * Focus is the only thing that uses this, and it is the reason it exists: a focus session that
 * still has a sidebar, a tab bar and a task count beside it has not reduced the system to one
 * thing, it has just changed the middle of the page.
 *
 * A context rather than a route group because the same route is both: picking something to work on
 * wants the navigation, and the session that follows does not.
 */

interface ImmersiveContextValue {
  immersive: boolean;
  setImmersive: (active: boolean) => void;
}

const ImmersiveContext = createContext<ImmersiveContextValue | null>(null);

export function ImmersiveProvider({ children }: { children: ReactNode }) {
  const [immersive, setImmersive] = useState(false);
  const value = useMemo(() => ({ immersive, setImmersive }), [immersive]);
  return <ImmersiveContext.Provider value={value}>{children}</ImmersiveContext.Provider>;
}

export function useImmersiveState(): boolean {
  return useContext(ImmersiveContext)?.immersive ?? false;
}

/**
 * Declares whether this screen wants the chrome hidden, and puts it back on the way out.
 *
 * The cleanup matters more than it looks: navigating away mid-session, or the component
 * unmounting for any other reason, must not leave someone in an app with no navigation.
 */
export function useImmersive(active: boolean): void {
  const context = useContext(ImmersiveContext);
  const setImmersive = context?.setImmersive;
  const set = useCallback((value: boolean) => setImmersive?.(value), [setImmersive]);

  useEffect(() => {
    set(active);
    return () => {
      set(false);
    };
  }, [active, set]);
}
