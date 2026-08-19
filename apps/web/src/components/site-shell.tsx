'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { localePath } from '@/i18n/config';
import { useDictionary, useLocale } from '@/i18n/context';
import { site } from '@/lib/site';
import { cn } from '@/lib/utils';

/**
 * Header + footer frame for everything except the in-game view, which brings
 * its own chrome. It reads the dictionary from context rather than props
 * because `loading.tsx` and the error boundaries render it with none, and its
 * children stay server components either way.
 */
export function SiteShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactNode {
  const dict = useDictionary();
  const locale = useLocale();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link
            href={localePath(locale, '/')}
            className="flex items-center gap-2.5 rounded-sm text-foreground no-underline"
          >
            <Logo className="size-8 text-primary" />
            <span className="flex flex-col leading-tight">
              <span className="font-serif text-lg tracking-tight">{site.name}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {dict.chrome.tagline}
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main"
        className={cn('mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6', className)}
      >
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}

export function SiteFooter(): ReactNode {
  const { footer } = useDictionary().chrome;

  return (
    <footer className="mt-8 border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-5 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-6">
        <p className="max-w-3xl">
          {footer.attributionPrefix}{' '}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            rel="license noreferrer"
            target="_blank"
            // Underlined at rest, not just on hover: it sits inside a paragraph,
            // where colour alone would be the only thing marking it as a link.
            className="text-foreground underline underline-offset-2"
          >
            {footer.licence}
          </a>
          . {footer.disclaimer}
        </p>
        <a
          href={site.repository}
          rel="noreferrer"
          target="_blank"
          className="shrink-0 text-primary underline-offset-2 hover:underline"
        >
          {footer.source}
        </a>
      </div>
    </footer>
  );
}
