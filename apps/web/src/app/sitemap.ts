import { alternateLanguages, localePath, LOCALES } from '@/i18n/config';
import { absoluteUrl } from '@/lib/site';

import type { MetadataRoute } from 'next';

function absoluteAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(alternateLanguages(path)).map(([key, value]) => [key, absoluteUrl(value)]),
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the home page is indexable; rooms are ephemeral and excluded.
  return LOCALES.map((locale) => ({
    url: absoluteUrl(localePath(locale, '/')),
    changeFrequency: 'monthly' as const,
    priority: 1,
    alternates: { languages: absoluteAlternates('/') },
  }));
}
