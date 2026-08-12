import Link from 'next/link';
import { type ReactNode } from 'react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

/** Header + footer frame for everything except the in-game view, which brings its own chrome. */
export function SiteShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-sm text-foreground no-underline"
          >
            <Logo className="size-8 text-primary" />
            <span className="flex flex-col leading-tight">
              <span className="font-serif text-lg tracking-tight">WikiConn</span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                The free-association race
              </span>
            </span>
          </Link>
          <ThemeToggle className="ml-auto" />
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
  return (
    <footer className="mt-8 border-t border-border bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 text-xs leading-relaxed text-muted-foreground sm:px-6">
        <p>
          Article text and images come from Wikipedia and remain available under{' '}
          <span className="text-foreground">CC BY-SA 4.0</span>. WikiConn is an independent hobby
          project and is not affiliated with or endorsed by the Wikimedia Foundation.
        </p>
      </div>
    </footer>
  );
}
