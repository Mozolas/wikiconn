'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { FatalNotice } from '@/components/fatal-notice';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { localePath } from '@/i18n/config';
import { useDictionary, useLocale } from '@/i18n/context';

export default function GlobalError({ reset }: { error: Error; reset: () => void }): ReactNode {
  const { appError, chrome } = useDictionary();
  const locale = useLocale();

  return (
    <SiteShell>
      <FatalNotice
        title={appError.title}
        message={appError.message}
        action={
          <div className="flex justify-center gap-3">
            <Button onClick={reset}>{appError.retry}</Button>
            <Button variant="outline" asChild>
              <Link href={localePath(locale, '/')}>{chrome.backToHome}</Link>
            </Button>
          </div>
        }
      />
    </SiteShell>
  );
}
