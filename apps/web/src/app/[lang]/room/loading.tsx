'use client';

import { Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';

import { SiteShell } from '@/components/site-shell';
import { useDictionary } from '@/i18n/context';

/**
 * Scoped to the room routes, which are the dynamic ones. Sitting a segment
 * higher it also wrapped the home page, and because that page awaits `params`
 * it suspends: the prerendered HTML then opened with this spinner and a second
 * copy of the header, with the real content swapped in by script afterwards.
 * Crawlers that do not run JavaScript read the first copy.
 */
export default function Loading(): ReactNode {
  const { chrome } = useDictionary();

  return (
    <SiteShell>
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        {chrome.loading}
      </div>
    </SiteShell>
  );
}
