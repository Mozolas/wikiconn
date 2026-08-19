'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type PluralForms, plural } from '@/i18n/plural';

interface I18n {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * The dictionary arrives as a prop from the server layout rather than being
 * imported here, so only the active translation crosses into the browser.
 */
export function I18nProvider({ value, children }: { value: I18n; children: ReactNode }): ReactNode {
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (value === null) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export function useDictionary(): Dictionary {
  return useI18n().dict;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

/** Convenience wrapper so components do not have to thread the locale through. */
export function usePlural(): (forms: PluralForms, count: number) => string {
  const { locale } = useI18n();
  return (forms, count) => plural(locale, forms, count);
}
