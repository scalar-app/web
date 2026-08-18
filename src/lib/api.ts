import { createScalarClient, type FetchLike, type ScalarClient } from '@scalar/sdk';
import { env } from './env';

/**
 * The API client.
 *
 * In the browser the server is baked in at build time. In a packaged app there is nothing to bake:
 * Scalar is self-hosted, so the person has to say which server is theirs, and a native shell has to
 * supply its own fetch because a webview will not send a session cookie cross-origin.
 *
 * Both of those are runtime facts, so the client is built on first use rather than at import.
 */

const STORAGE_KEY = 'scalar.apiUrl';

interface Overrides {
  baseUrl?: string;
  fetch?: FetchLike;
}

declare global {
  interface Window {
    /** Set by a native shell before the app boots. */
    __SCALAR_API_URL__?: string;
    /** A fetch that is not subject to webview cookie and CORS rules. */
    __SCALAR_FETCH__?: FetchLike;
  }
}

let overrides: Overrides = {};
let client: ScalarClient | null = null;

function trim(url: string): string {
  return url.replace(/\/+$/, '');
}

function storedUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? trim(value) : null;
  } catch {
    // Private modes and locked down webviews can refuse storage. Not a reason to fail.
    return null;
  }
}

/**
 * Where the API lives, in order of precedence: a native shell's injection, what the person chose,
 * then the build time default. Empty when nothing is configured, which is the signal to ask.
 */
export function apiUrl(): string {
  if (overrides.baseUrl) return overrides.baseUrl;
  if (typeof window !== 'undefined' && window.__SCALAR_API_URL__) {
    return trim(window.__SCALAR_API_URL__);
  }
  return storedUrl() ?? env.apiUrl;
}

export function isApiConfigured(): boolean {
  return apiUrl().length > 0;
}

/** Records the server this install talks to, and rebuilds the client against it. */
export function setApiUrl(url: string): void {
  const next = trim(url.trim());
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Fall through: the override below still makes this session work.
  }
  overrides = { ...overrides, baseUrl: next };
  client = null;
}

export function forgetApiUrl(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
  overrides = {};
  client = null;
}

/** Called by a native shell before render, to supply its server and its own fetch. */
export function configureScalar(next: Overrides): void {
  overrides = { ...overrides, ...next };
  client = null;
}

function resolvedFetch(): FetchLike | undefined {
  if (overrides.fetch) return overrides.fetch;
  if (typeof window !== 'undefined' && window.__SCALAR_FETCH__) return window.__SCALAR_FETCH__;
  return undefined;
}

function build(): ScalarClient {
  const fetchImpl = resolvedFetch();
  return createScalarClient({
    baseUrl: apiUrl(),
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
}

/**
 * A lazy handle rather than a client instance, so call sites stay `scalar.tasks.list(...)` while
 * the underlying client can be rebuilt when the server changes.
 */
export const scalar = new Proxy({} as ScalarClient, {
  get(_target, property: string | symbol) {
    client ??= build();
    return Reflect.get(client, property) as unknown;
  },
});
