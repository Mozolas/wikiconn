'use client';

import { type Language } from '@wikiconn/shared';
import { memo, type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { WIKIPEDIA_CHROME } from '@/lib/wikipedia-chrome';

/** Prefixed so it cannot collide with an id inside the article itself. */
export const ARTICLE_TOP_ID = 'wikiconn-article-top';

interface Props {
  title: string;
  html: string;
  lang: Language;
  busy: boolean;
  onNavigate: (slug: string) => void;
}

/**
 * Renders one server-sanitized Wikipedia article (HTML produced by WikiSanitizer
 * in apps/api) with Wikipedia's own page furniture around it.
 *
 * Internal article links carry data-wiki-slug; we delegate-listen for clicks on
 * them and report the target instead of navigating. The handler is bound once
 * per mount through a ref so room-state re-renders cannot tear it down
 * mid-click, and both `click` and `auxclick` are intercepted so middle- or
 * cmd-click cannot open a new tab and step outside the race.
 */
export const ArticleView = memo(function ArticleView({
  title,
  html,
  lang,
  busy,
  onNavigate,
}: Props): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const onNavigateRef = useRef(onNavigate);

  useLayoutEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    const root = ref.current;
    if (root === null) return;

    function handleActivate(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('a') === null) return;

      const link = target.closest<HTMLAnchorElement>('a[data-wiki-slug]');
      if (link === null) {
        // Namespace, external, red or fragment link — swallow the click.
        event.preventDefault();
        return;
      }

      const slug = link.dataset['wikiSlug'];
      if (slug === undefined || slug.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      onNavigateRef.current(slug);
    }

    root.addEventListener('click', handleActivate);
    root.addEventListener('auxclick', handleActivate);
    return () => {
      root.removeEventListener('click', handleActivate);
      root.removeEventListener('auxclick', handleActivate);
    };
  }, []);

  return (
    <article
      className={cn(
        'rounded-sm border border-border bg-card px-5 py-6 shadow-xs transition-opacity sm:px-8 sm:py-7',
        busy && 'opacity-50',
      )}
      aria-busy={busy}
    >
      {/* The whole block is Wikipedia's, in Wikipedia's language, which is not
          necessarily the interface's: without this a screen reader would read an
          English article with Czech phonetics. */}
      <header lang={lang} className="border-b border-wiki-line pb-2">
        <h1
          id={ARTICLE_TOP_ID}
          className="scroll-mt-20 font-serif text-2xl leading-tight sm:text-[2rem]"
        >
          {title}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{WIKIPEDIA_CHROME[lang].tagline}</p>
      </header>

      <div
        ref={ref}
        lang={lang}
        className="wiki-article mt-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* No link back to wikipedia.org on purpose: that would be a way out of the race. */}
      <footer className="mt-8 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        From the {lang.toUpperCase()} Wikipedia article “{title}”, available under CC BY-SA 4.0.
      </footer>
    </article>
  );
});
