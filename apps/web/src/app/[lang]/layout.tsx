import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import {
  alternateLanguages,
  DEFAULT_LOCALE,
  isLocale,
  localePath,
  LOCALES,
  OG_LOCALE,
} from '@/i18n/config';
import { I18nProvider } from '@/i18n/context';
import { getDictionary } from '@/i18n/dictionaries';
import { absoluteUrl, site } from '@/lib/site';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

import '../globals.css';

import type { Metadata, Viewport } from 'next';

/**
 * Declared by hand rather than left to the app/opengraph-image.png file
 * convention: the pages live under [lang] and the convention file sits above
 * that segment, from where it no longer attaches to them. The file is still
 * what generates and serves this route.
 */
function socialImage(alt: string): {
  url: string;
  width: number;
  height: number;
  type: string;
  alt: string;
} {
  return { url: '/opengraph-image.png', width: 1200, height: 630, type: 'image/png', alt };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const { meta } = getDictionary(locale);

  return {
    metadataBase: new URL(site.origin),
    title: {
      default: meta.title,
      template: `%s · ${site.name}`,
    },
    description: meta.description,
    applicationName: site.name,
    authors: [{ name: site.author }],
    creator: site.author,
    publisher: site.author,
    category: 'games',
    keywords: [...meta.keywords],
    manifest: `/manifest/${locale}`,
    alternates: {
      canonical: absoluteUrl(localePath(locale, '/')),
      languages: Object.fromEntries(
        Object.entries(alternateLanguages('/')).map(([tag, path]) => [tag, absoluteUrl(path)]),
      ),
    },
    openGraph: {
      type: 'website',
      url: absoluteUrl(localePath(locale, '/')),
      siteName: site.name,
      title: meta.title,
      description: meta.description,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => OG_LOCALE[other]),
      images: [socialImage(meta.ogImageAlt)],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [socialImage(meta.ogImageAlt)],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    // Room codes are six characters of A–Z and 2–9; Safari would otherwise turn
    // some of them into phone numbers.
    formatDetection: { telephone: false, date: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#101418' },
  ],
  colorScheme: 'light dark',
};

/** Every locale is known up front, so both trees prerender at build time. */
export function generateStaticParams(): { lang: string }[] {
  return LOCALES.map((lang) => ({ lang }));
}

// Anything that is not a known locale is not a route at all. Rejecting it here
// gives a real 404 from the router, where returning notFound() from the page
// would only render an empty shell with a 200.
export const dynamicParams = false;

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}): Promise<ReactNode> {
  const { lang } = await params;
  // The layout and the page render in parallel, so the page below is the one
  // that raises the 404 for an unknown segment. The shell still has to render
  // something around it, which is what this fallback is for.
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Runs before the first paint so the stored theme is never flashed away. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          {dict.chrome.skipToContent}
        </a>
        <I18nProvider value={{ locale, dict }}>{children}</I18nProvider>
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
