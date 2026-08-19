import { stripTrailingSlash } from '@/lib/utils';

/**
 * Canonical identity of the deployment. `origin` has to be absolute at build
 * time: Next resolves every relative metadata URL against it, and the value is
 * baked into the client bundle like the other NEXT_PUBLIC_* settings.
 */
export const site = {
  origin: stripTrailingSlash(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://wikiconn.mozola.net'),
  name: 'WikiConn',
  repository: 'https://github.com/Mozolas/wikiconn',
  author: 'Marek Mozola',
} as const;

/**
 * The root collapses to the bare origin, because that is the form Next
 * normalises canonical and hreflang URLs to and there is no overriding it.
 * Emitting the slash here would leave the sitemap and the schema.org @id values
 * one character away from every URL the page declares for itself.
 */
export function absoluteUrl(path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean === '/' ? site.origin : `${site.origin}${clean}`;
}
