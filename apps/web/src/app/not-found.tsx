import { type ReactNode } from 'react';

import { FatalNotice } from '@/components/fatal-notice';
import { SiteShell } from '@/components/site-shell';

export default function NotFound(): ReactNode {
  return (
    <SiteShell>
      <FatalNotice
        title="Page not found"
        message="That room code doesn’t look right, or the page never existed."
      />
    </SiteShell>
  );
}
