import { type Language } from '@wikiconn/shared';

/**
 * Wikipedia's own furniture around the article body, in Wikipedia's own words.
 *
 * Deliberately keyed by the article's language rather than by the interface
 * locale: a Czech player racing through English Wikipedia should see the English
 * page, tagline and contents rail, because that is the page they are racing
 * through. This is why these strings live here instead of in the dictionary.
 */
interface WikipediaChrome {
  tagline: string;
  contents: string;
  top: string;
}

export const WIKIPEDIA_CHROME: Record<Language, WikipediaChrome> = {
  en: {
    tagline: 'From Wikipedia, the free encyclopedia',
    contents: 'Contents',
    top: '(Top)',
  },
  cs: {
    tagline: 'Z Wikipedie, otevřené encyklopedie',
    contents: 'Obsah',
    top: '(Začátek)',
  },
};
