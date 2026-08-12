'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { FatalNotice } from '@/components/fatal-notice';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { error: Error; reset: () => void }): ReactNode {
  return (
    <SiteShell>
      <FatalNotice
        title="Something went wrong"
        message="An unexpected error broke this page. Trying again usually helps."
        action={
          <div className="flex justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        }
      />
    </SiteShell>
  );
}
