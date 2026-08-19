'use client';

import { type Language } from '@wikiconn/shared';
import { type ReactNode } from 'react';

import { ARTICLE_TOP_ID } from '@/components/game/article-view';
import { type TocEntry } from '@/lib/article-toc';
import { WIKIPEDIA_CHROME } from '@/lib/wikipedia-chrome';

/** Wikipedia's left-hand "Contents" rail. Hidden when the article has no sections. */
export function ArticleToc({ entries, lang }: { entries: TocEntry[]; lang: Language }): ReactNode {
  if (entries.length === 0) return null;

  const chrome = WIKIPEDIA_CHROME[lang];

  return (
    <nav
      lang={lang}
      aria-labelledby="toc-heading"
      className="sticky top-20 max-h-[80vh] overflow-y-auto"
    >
      <h2
        id="toc-heading"
        className="border-b border-border pb-1.5 text-sm font-semibold tracking-tight"
      >
        {chrome.contents}
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        <li>
          <a
            href={`#${ARTICLE_TOP_ID}`}
            className="block rounded-sm px-2 py-1 text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
          >
            {chrome.top}
          </a>
        </li>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${encodeURIComponent(entry.id)}`}
              className="block rounded-sm px-2 py-1 text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
