import { Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';

import { SiteShell } from '@/components/site-shell';

export default function Loading(): ReactNode {
  return (
    <SiteShell>
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        Loading…
      </div>
    </SiteShell>
  );
}
