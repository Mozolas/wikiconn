'use client';

import { useSyncExternalStore } from 'react';

/** What the user picked. `system` follows the OS setting, like Wikipedia's "Automatic". */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What is actually painted. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wikiconn:theme';

const DARK_CLASS = 'dark';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Applies the stored theme to <html>. Serialized into the document head and run
 * before hydration, so the first painted frame is already correct. Because it
 * ships as source text it may only touch its own arguments and browser globals —
 * anything from module scope would be renamed by the bundler.
 */
export function bootTheme(storageKey: string, darkQuery: string, darkClass: string): void {
  try {
    const stored = localStorage.getItem(storageKey);
    const dark = stored === 'dark' || (stored !== 'light' && matchMedia(darkQuery).matches);
    document.documentElement.classList.toggle(darkClass, dark);
  } catch {
    // Storage or matchMedia blocked — keep the light default.
  }
}

export const THEME_BOOT_ARGS = [THEME_STORAGE_KEY, DARK_QUERY, DARK_CLASS] as const;

export const THEME_BOOT_SCRIPT = `(${bootTheme.toString()})(${THEME_BOOT_ARGS.map((arg) => JSON.stringify(arg)).join(',')});`;

export function normalizePreference(raw?: string | null): ThemePreference {
  return raw === 'dark' || raw === 'light' ? raw : 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

const listeners = new Set<() => void>();
let cachedPreference: ThemePreference | null = null;
let systemQuery: MediaQueryList | null = null;

function hasDom(): boolean {
  return 'document' in globalThis;
}

function readStoredPreference(): ThemePreference {
  try {
    return normalizePreference(globalThis.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function getSystemQuery(): MediaQueryList | null {
  if (!('matchMedia' in globalThis)) return null;
  systemQuery ??= globalThis.matchMedia(DARK_QUERY);
  return systemQuery;
}

function systemPrefersDark(): boolean {
  return getSystemQuery()?.matches ?? false;
}

function apply(theme: ResolvedTheme): void {
  if (!hasDom()) return;
  globalThis.document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark');
}

function notify(): void {
  for (const listener of listeners) listener();
}

function onExternalChange(): void {
  cachedPreference = readStoredPreference();
  apply(resolveTheme(cachedPreference, systemPrefersDark()));
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    getSystemQuery()?.addEventListener('change', onExternalChange);
    globalThis.addEventListener('storage', onExternalChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      getSystemQuery()?.removeEventListener('change', onExternalChange);
      globalThis.removeEventListener('storage', onExternalChange);
    }
  };
}

function getPreference(): ThemePreference {
  cachedPreference ??= hasDom() ? readStoredPreference() : 'system';
  return cachedPreference;
}

function getResolved(): ResolvedTheme {
  return resolveTheme(getPreference(), systemPrefersDark());
}

const getServerPreference = (): ThemePreference => 'system';
const getServerResolved = (): ResolvedTheme => 'light';
const getMounted = (): boolean => true;
const getServerMounted = (): boolean => false;

export function setThemePreference(next: ThemePreference): void {
  cachedPreference = next;
  apply(resolveTheme(next, systemPrefersDark()));
  try {
    if (next === 'system') globalThis.localStorage.removeItem(THEME_STORAGE_KEY);
    else globalThis.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private mode / blocked storage — the choice still applies for this session.
  }
  notify();
}

export interface ThemeControls {
  /** What the user picked, including `system`. */
  preference: ThemePreference;
  /** What is painted right now. */
  resolved: ResolvedTheme;
  /** False during SSR and the hydration render; guard theme-dependent output with it. */
  mounted: boolean;
  setPreference: (next: ThemePreference) => void;
}

export function useTheme(): ThemeControls {
  const preference = useSyncExternalStore(subscribe, getPreference, getServerPreference);
  const resolved = useSyncExternalStore(subscribe, getResolved, getServerResolved);
  const mounted = useSyncExternalStore(subscribe, getMounted, getServerMounted);
  return { preference, resolved, mounted, setPreference: setThemePreference };
}
