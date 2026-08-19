import { MousePointerClick, Share2, Trophy } from 'lucide-react';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

import { JsonLd } from '@/components/json-ld';
import { SiteShell } from '@/components/site-shell';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { faqPage, siteGraph } from '@/lib/structured-data';

import { HomeForms } from './home-forms';

/** One icon per step, in the order the dictionary lists them. */
const STEP_ICONS = [Share2, MousePointerClick, Trophy] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<ReactNode> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { home, meta, chrome } = getDictionary(lang);

  return (
    <SiteShell>
      <JsonLd data={siteGraph(lang, { tagline: chrome.tagline, description: meta.description })} />
      <JsonLd data={faqPage(lang, home.faq.entries)} />
      <div className="space-y-12">
        <section className="max-w-2xl space-y-4">
          <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            {home.title}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{home.lede}</p>
        </section>

        <HomeForms />

        <section className="max-w-3xl space-y-4">
          <h2 className="font-serif text-xl tracking-tight">{home.whatIs.heading}</h2>
          <div className="space-y-3 leading-relaxed text-muted-foreground">
            {home.whatIs.paragraphs.map((paragraph, index) => (
              // A fixed list that never reorders, so the position is the identity.
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-xl tracking-tight">{home.howItWorks.heading}</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {home.howItWorks.steps.map(({ title, body }, index) => {
              // No fallback on purpose: a missing icon should look missing, where
              // repeating the first one would just look wrong.
              const Icon = STEP_ICONS[index];
              return (
                <li
                  key={title}
                  className="rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      {Icon === undefined ? null : <Icon aria-hidden="true" className="size-4" />}
                    </span>
                    <span className="text-sm font-semibold">
                      {index + 1}. {title}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="max-w-3xl space-y-4">
          <h2 className="font-serif text-xl tracking-tight">{home.faq.heading}</h2>
          <dl className="divide-y divide-border border-y border-border">
            {home.faq.entries.map(({ question, answer }) => (
              <div key={question} className="py-4">
                <dt>
                  <h3 className="text-sm font-semibold">{question}</h3>
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </SiteShell>
  );
}
