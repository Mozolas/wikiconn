export const LOCALES = ['en', 'cs'] as const;

export type Locale = (typeof LOCALES)[number];

/** Served from the root, so it carries no prefix in the URL. */
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Turns an unprefixed application path into the one for a given locale. The
 * default locale keeps the bare path, so the invite links already in
 * circulation and the already-indexed home page stay where they are.
 */
export function localePath(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * The inverse: splits a pathname into its locale and the path underneath.
 *
 * The default prefix is stripped too, even though localePath never produces it.
 * usePathname() reports the path *after* the rewrite, so the browser showing
 * `/room/ABCDEF` hands us `/en/room/ABCDEF`.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first = '', ...rest] = pathname.split('/');
  if (isLocale(first)) {
    return { locale: first, path: `/${rest.join('/')}` };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** BCP 47 tags in the form OpenGraph asks for them. */
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', cs: 'cs_CZ' };

/** hreflang map for every page, plus the fallback for unmatched languages. */
export function alternateLanguages(path = '/'): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = localePath(locale, path);
  languages['x-default'] = localePath(DEFAULT_LOCALE, path);
  return languages;
}
