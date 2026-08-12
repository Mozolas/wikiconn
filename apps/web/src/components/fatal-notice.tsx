import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  message: string;
  /** Replaces the default "back to home" action. */
  action?: ReactNode;
}

/** Dead-end screen for the cases a player cannot recover from by waiting. */
export function FatalNotice({ title, message, action }: Props): ReactNode {
  return (
    <div className="mx-auto max-w-md rounded-md border border-border bg-card p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </div>
      <h1 className="mt-3 font-serif text-xl tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-5">
        {action ?? (
          <Button asChild className="w-full">
            <Link href="/">Back to home</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
