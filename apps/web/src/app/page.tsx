import { MousePointerClick, Share2, Trophy } from 'lucide-react';
import { type ReactNode } from 'react';

import { SiteShell } from '@/components/site-shell';

import { HomeForms } from './home-forms';

const STEPS = [
  {
    Icon: Share2,
    title: 'Create and share',
    body: 'Open a room, pick the starting and target article, then send the six-character code to your friends.',
  },
  {
    Icon: MousePointerClick,
    title: 'Click your way there',
    body: 'No search box, no address bar — only the links inside the article you are reading right now.',
  },
  {
    Icon: Trophy,
    title: 'First one home wins',
    body: 'Everyone sees the finish reveal: every player’s full route, click count and time.',
  },
] as const;

export default function HomePage(): ReactNode {
  return (
    <SiteShell>
      <div className="space-y-10">
        <section className="max-w-2xl space-y-4">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Race through Wikipedia.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Two to five players, one starting article, one target. Whoever gets there first — using
            nothing but the links inside the articles — wins. No accounts, no downloads.
          </p>
        </section>

        <HomeForms />

        <section className="space-y-4">
          <h2 className="font-serif text-xl tracking-tight">How it works</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ Icon, title, body }, index) => (
              <li
                key={title}
                className="rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">
                    {index + 1}. {title}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </SiteShell>
  );
}
