'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { localePath, LOCALES, splitLocale } from '@/i18n/config';
import { useDictionary, useLocale } from '@/i18n/context';
import { cn } from '@/lib/utils';

/**
 * Plain links rather than a router push: switching language crosses into a
 * different prerendered tree, and a full load is both simpler and what the
 * hreflang pair describes. The target is the same page in the other language,
 * so a player in a lobby stays in that lobby.
 */
export function LanguageSwitcher({ className }: { className?: string }): ReactNode {
  const active = useLocale();
  const { chrome } = useDictionary();
  const pathname = usePathname();
  const { path } = splitLocale(pathname);

  return (
    <nav
      aria-label={chrome.language}
      className={cn(
        'flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5',
        className,
      )}
    >
      {LOCALES.map((locale) => (
        <a
          key={locale}
          href={localePath(locale, path)}
          hrefLang={locale}
          aria-current={locale === active ? 'page' : undefined}
          // The visible label is the code, so the spoken one has to contain it:
          // otherwise "click CS" matches nothing in voice control.
          aria-label={`${chrome.languageNames[locale]} (${locale.toUpperCase()})`}
          className={cn(
            'rounded-sm px-2 py-1 text-xs font-medium uppercase no-underline transition-colors',
            locale === active
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {locale}
        </a>
      ))}
    </nav>
  );
}
