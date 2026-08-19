import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale, localePath, LOCALES, splitLocale } from '@/i18n/config';

describe('localePath', () => {
  it('leaves the default locale unprefixed, so shared invites keep working', () => {
    expect(localePath('en', '/')).toBe('/');
    expect(localePath('en', '/room/ABCDEF')).toBe('/room/ABCDEF');
  });

  it('prefixes every other locale', () => {
    expect(localePath('cs', '/')).toBe('/cs');
    expect(localePath('cs', '/room/ABCDEF')).toBe('/cs/room/ABCDEF');
  });

  it('tolerates a path given without its leading slash', () => {
    expect(localePath('cs', 'room/ABCDEF')).toBe('/cs/room/ABCDEF');
  });
});

describe('splitLocale', () => {
  it('reads the prefix when there is one', () => {
    expect(splitLocale('/cs')).toEqual({ locale: 'cs', path: '/' });
    expect(splitLocale('/cs/room/ABCDEF')).toEqual({ locale: 'cs', path: '/room/ABCDEF' });
  });

  it('strips the default prefix too, because usePathname reports the rewrite', () => {
    // The browser shows /room/ABCDEF; Next rewrites it to /en/room/ABCDEF and
    // that is what usePathname hands back. Leaving the prefix on produced a
    // language switcher pointing at /cs/en.
    expect(splitLocale('/en')).toEqual({ locale: 'en', path: '/' });
    expect(splitLocale('/en/room/ABCDEF')).toEqual({ locale: 'en', path: '/room/ABCDEF' });
  });

  it('falls back to the default for a path with no locale at all', () => {
    expect(splitLocale('/room/ABCDEF')).toEqual({ locale: 'en', path: '/room/ABCDEF' });
    expect(splitLocale('/')).toEqual({ locale: 'en', path: '/' });
  });

  it('round-trips with localePath for every locale', () => {
    for (const locale of LOCALES) {
      for (const path of ['/', '/room/ABCDEF', '/room/ABCDEF/play']) {
        expect(splitLocale(localePath(locale, path))).toEqual({ locale, path });
      }
    }
  });
});

describe('isLocale', () => {
  it('accepts what is supported and nothing else', () => {
    expect(isLocale(DEFAULT_LOCALE)).toBe(true);
    expect(isLocale('cs')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale('room')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});
