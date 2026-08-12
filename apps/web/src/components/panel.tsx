import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  title: ReactNode;
  /** Rendered on the right of the title bar — a count, a badge, an action. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Bordered box with a titled bar, echoing the section boxes on Wikipedia's main page. */
export function Panel({ title, aside, children, className, bodyClassName }: Props): ReactNode {
  return (
    <section className={cn('rounded-md border border-border bg-card', className)}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="font-serif text-lg tracking-tight">{title}</h2>
        {aside}
      </div>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}
