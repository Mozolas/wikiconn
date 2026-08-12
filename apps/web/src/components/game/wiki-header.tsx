'use client';

import { Flag, MousePointerClick, Target, Timer } from 'lucide-react';
import { type ReactNode } from 'react';

import { Logo } from '@/components/logo';
import { formatDuration, humanSlug } from '@/lib/format';

interface Props {
  targetSlug: string | undefined;
  elapsedMs: number;
  clickCount: number;
  finished: boolean;
  loading: boolean;
}

/**
 * Sticky game bar in the shape of Wikipedia's Vector 2022 header: the brand on
 * the left, a search-box-like field in the middle (holding the target instead of
 * a query) and the run's live stats on the right. The mark is intentionally not
 * a link — a stray click should not drop a player out of the race.
 */
export function WikiHeader({
  targetSlug,
  elapsedMs,
  clickCount,
  finished,
  loading,
}: Props): ReactNode {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-[100rem] items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <span className="flex items-center gap-2">
          <Logo className="size-7 text-primary" />
          <span className="hidden font-serif text-base tracking-tight sm:inline">WikiConn</span>
        </span>

        <p className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-input bg-background px-3 py-1.5">
          <Target aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <span className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
            Target
          </span>
          <span className="truncate font-serif text-sm sm:text-base">
            {targetSlug === undefined ? '—' : humanSlug(targetSlug)}
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Stat icon={<Timer aria-hidden="true" className="size-3.5" />} label="Elapsed time">
            {formatDuration(elapsedMs)}
          </Stat>
          <Stat
            icon={<MousePointerClick aria-hidden="true" className="size-3.5" />}
            label="Clicks used"
          >
            {clickCount}
          </Stat>
          {finished ? (
            <span className="flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              <Flag aria-hidden="true" className="size-3.5" />
              <span className="hidden sm:inline">Finished</span>
            </span>
          ) : null}
        </div>
      </div>

      <div aria-hidden={!loading} className="h-0.5 overflow-hidden bg-transparent">
        {loading ? <div className="wiki-progress h-full w-1/4 bg-primary" /> : null}
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <span
      title={label}
      className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-sm tabular-nums text-muted-foreground"
    >
      {icon}
      <span className="sr-only">{label}: </span>
      <span className="font-medium text-foreground">{children}</span>
    </span>
  );
}
