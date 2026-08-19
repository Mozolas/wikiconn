import { isValidRoomCode } from '@wikiconn/shared';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

import { DEFAULT_LOCALE, isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

import { PlayView } from './play-view';

import type { Metadata } from 'next';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return {
    title: getDictionary(locale).meta.playTitle,
    robots: { index: false, follow: false, nocache: true },
    // Cleared, not inherited. The layout points both at the home page, which on
    // a noindex page means declaring "index that instead of me" and advertising
    // translations of a page this is not.
    alternates: { canonical: null, languages: {} },
  };
}

interface PageProps {
  params: Promise<{ lang: string; code: string }>;
}

export default async function PlayPage({ params }: PageProps): Promise<ReactNode> {
  const { lang, code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!isLocale(lang) || !isValidRoomCode(code)) notFound();
  return <PlayView code={code} />;
}
