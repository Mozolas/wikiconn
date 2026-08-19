import { type Locale, localePath } from '@/i18n/config';
import { absoluteUrl, site } from '@/lib/site';

export type JsonLdNode = Record<string, unknown>;

interface SiteCopy {
  /** The strapline under the wordmark, which is the site's other name. */
  tagline: string;
  description: string;
}

/**
 * One person behind every language, so this id stays global. Everything else is
 * scoped to the locale's canonical URL: the Czech page and the English one
 * describe themselves differently, and two pages cannot share an @id while
 * saying different things.
 */
const PERSON_ID = `${absoluteUrl('/')}#person`;

function ids(locale: Locale): { base: string; website: string; game: string; faq: string } {
  const base = absoluteUrl(localePath(locale, '/'));
  return { base, website: `${base}#website`, game: `${base}#game`, faq: `${base}#faq` };
}

function person(): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: site.author,
    url: site.repository,
  };
}

function website(locale: Locale, copy: SiteCopy): JsonLdNode {
  const id = ids(locale);
  return {
    '@type': 'WebSite',
    '@id': id.website,
    url: id.base,
    name: site.name,
    alternateName: copy.tagline,
    description: copy.description,
    inLanguage: locale,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
  };
}

function game(locale: Locale, copy: SiteCopy): JsonLdNode {
  const id = ids(locale);
  return {
    '@type': 'VideoGame',
    '@id': id.game,
    name: site.name,
    url: id.base,
    description: copy.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any modern web browser',
    gamePlatform: 'Web browser',
    playMode: 'MultiPlayer',
    genre: ['Trivia game', 'Puzzle', 'Racing'],
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5 },
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    inLanguage: locale,
    author: { '@id': PERSON_ID },
    license: 'https://spdx.org/licenses/MIT.html',
    isPartOf: { '@id': id.website },
  };
}

/** The graph the home page carries, in the language it is written in. */
export function siteGraph(locale: Locale, copy: SiteCopy): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@graph': [person(), website(locale, copy), game(locale, copy)],
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Built from the same array the page renders, so the two cannot disagree. */
export function faqPage(locale: Locale, entries: readonly FaqEntry[]): JsonLdNode {
  const id = ids(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': id.faq,
    inLanguage: locale,
    isPartOf: { '@id': id.website },
    mainEntity: entries.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
