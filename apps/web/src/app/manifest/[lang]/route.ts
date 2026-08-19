import { DEFAULT_LOCALE, isLocale, localePath, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { site } from '@/lib/site';

import type { MetadataRoute } from 'next';

// One manifest per language rather than the app/manifest.ts convention, which
// can only produce a single file. Installing from /cs has to launch back into
// /cs; a shared manifest would send every installer to the English tree.
export const dynamic = 'force-static';

export function generateStaticParams(): { lang: string }[] {
  return LOCALES.map((lang) => ({ lang }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> },
): Promise<Response> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const { meta } = getDictionary(locale);
  const home = localePath(locale, '/');

  const manifest: MetadataRoute.Manifest = {
    name: meta.title,
    short_name: site.name,
    description: meta.description,
    start_url: home,
    scope: '/',
    display: 'standalone',
    // Matches the light half of viewport.themeColor; the manifest has no
    // media-query form and the app boots light by default.
    background_color: '#f8f9fa',
    theme_color: '#f8f9fa',
    categories: ['games', 'education'],
    lang: locale,
    dir: 'ltr',
    // The existing app/icon.svg scales to every size an installer asks for,
    // which beats shipping a ladder of rasterised copies.
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };

  return Response.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
