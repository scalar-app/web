'use client';

import { useSyncExternalStore } from 'react';

/**
 * What the native shell tells the web app about the window it is running in.
 *
 * The shell injects these before the app boots, the same way it injects its own fetch. In a
 * browser they are all absent and every helper here answers "not native", which is why the title
 * bar can be rendered unconditionally and simply draw nothing.
 */

export type NativePlatform = 'macos' | 'windows' | 'linux';

/** The three the desktop app builds for. Anything else is treated as a browser. */
const PLATFORMS: readonly string[] = ['macos', 'windows', 'linux'];

export interface NativeWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    /** Set by the native shell before the app boots. */
    __SCALAR_NATIVE__?: boolean;
    __SCALAR_PLATFORM__?: string;
    __SCALAR_WINDOW__?: NativeWindowControls;
  }
}

export function nativePlatform(): NativePlatform | null {
  if (typeof window === 'undefined' || !window.__SCALAR_NATIVE__) return null;
  const platform = window.__SCALAR_PLATFORM__;
  return platform && PLATFORMS.includes(platform) ? (platform as NativePlatform) : null;
}

export function windowControls(): NativeWindowControls | null {
  return typeof window === 'undefined' ? null : (window.__SCALAR_WINDOW__ ?? null);
}

const subscribeToNothing = () => () => undefined;

/**
 * Read through `useSyncExternalStore` so the prerendered HTML and the browser agree. The build
 * cannot know it will be bundled into an app, so it describes a browser and the webview corrects
 * that on hydration. It only changes by way of a relaunch, so there is nothing to subscribe to.
 */
export function useNativePlatform(): NativePlatform | null {
  return useSyncExternalStore(subscribeToNothing, nativePlatform, () => null);
}
