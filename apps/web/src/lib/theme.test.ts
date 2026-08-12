import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  bootTheme,
  normalizePreference,
  resolveTheme,
  THEME_BOOT_ARGS,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
} from './theme';

function stubSystemPreference(prefersDark: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches: prefersDark }));
}

/** Runs the exact function (with the exact arguments) that ships in the page head. */
function boot(prefersDark: boolean): boolean {
  stubSystemPreference(prefersDark);
  bootTheme(...THEME_BOOT_ARGS);
  return globalThis.document.documentElement.classList.contains('dark');
}

afterEach(() => {
  globalThis.localStorage.clear();
  globalThis.document.documentElement.classList.remove('dark');
  vi.unstubAllGlobals();
});

describe('normalizePreference', () => {
  it('accepts the two explicit choices', () => {
    expect(normalizePreference('light')).toBe('light');
    expect(normalizePreference('dark')).toBe('dark');
  });

  it('falls back to system for anything else', () => {
    expect(normalizePreference(null)).toBe('system');
    expect(normalizePreference()).toBe('system');
    expect(normalizePreference('')).toBe('system');
    expect(normalizePreference('sepia')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('honours an explicit choice regardless of the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system setting when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('bootTheme', () => {
  it('paints the stored preference before hydration', () => {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(boot(false)).toBe(true);

    globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(boot(true)).toBe(false);
  });

  it('falls back to the system setting when nothing is stored', () => {
    expect(boot(true)).toBe(true);
    expect(boot(false)).toBe(false);
  });

  it('agrees with resolveTheme in every combination', () => {
    for (const stored of ['light', 'dark', 'sepia', null]) {
      for (const prefersDark of [true, false]) {
        if (stored === null) globalThis.localStorage.removeItem(THEME_STORAGE_KEY);
        else globalThis.localStorage.setItem(THEME_STORAGE_KEY, stored);

        const expected = resolveTheme(normalizePreference(stored), prefersDark) === 'dark';
        expect(boot(prefersDark)).toBe(expected);
      }
    }
  });

  it('survives blocked storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => {
      boot(true);
    }).not.toThrow();
  });
});

describe('THEME_BOOT_SCRIPT', () => {
  it('serializes the booter together with its arguments', () => {
    for (const arg of THEME_BOOT_ARGS) expect(THEME_BOOT_SCRIPT).toContain(JSON.stringify(arg));
    expect(THEME_BOOT_SCRIPT).toContain('classList');
    expect(THEME_BOOT_SCRIPT.startsWith('(')).toBe(true);
  });
});
