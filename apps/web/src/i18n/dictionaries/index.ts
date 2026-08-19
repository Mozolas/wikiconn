import { type Locale } from '@/i18n/config';
import { cs } from '@/i18n/dictionaries/cs';
import { type Dictionary, en } from '@/i18n/dictionaries/en';

export type { Dictionary } from '@/i18n/dictionaries/en';

const DICTIONARIES: Record<Locale, Dictionary> = { en, cs };

/**
 * Server-only: importing this module pulls in every translation, which is why
 * client components go through the i18n context instead.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
