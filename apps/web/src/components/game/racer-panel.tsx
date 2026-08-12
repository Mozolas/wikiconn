'use client';

import { type PlayerState, type VisibilitySettings } from '@wikiconn/shared';
import { Crown, Flag, MousePointerClick, WifiOff } from 'lucide-react';
import { type ReactNode } from 'react';

import { humanSlug, initialGrapheme } from '@/lib/format';
import { racerAccentClass } from '@/lib/racer-accent';
import { cn } from '@/lib/utils';

interface Props {
  players: PlayerState[];
  hostPlayerId: string;
  selfPlayerId: string;
  visibility: VisibilitySettings;
}

const PATH_TAIL = 3;

export function RacerPanel({ players, hostPlayerId, selfPlayerId, visibility }: Props): ReactNode {
  if (players.length === 0) {
    return <p className="text-sm text-muted-foreground">No racers yet.</p>;
  }

  return (
    // The strip sits above the article on phones, so it holds a fixed height:
    // a rival's click count changing must not shove the text under the reader's thumb.
    <ul className="flex min-h-28 gap-2 overflow-x-auto pb-1 lg:min-h-0 lg:flex-col lg:overflow-x-visible lg:pb-0">
      {players.map((player, index) => {
        const isSelf = player.playerId === selfPlayerId;
        const finished = player.finishedAt !== undefined;
        const showCurrent = isSelf || visibility.showCurrentArticle;
        const showClicks = isSelf || visibility.showClickCount;
        const showPath = isSelf || visibility.showFullPath;
        const tail = player.path.slice(-PATH_TAIL);

        return (
          <li
            key={player.playerId}
            className={cn(
              racerAccentClass(index),
              'min-w-52 shrink-0 rounded-sm border bg-card p-2.5 lg:min-w-0 lg:shrink',
              isSelf ? 'border-primary/50' : 'border-border',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="racer-avatar flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase">
                {initialGrapheme(player.nickname)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {player.nickname}
                {isSelf ? <span className="ml-1 text-muted-foreground">(you)</span> : null}
              </span>
              {player.playerId === hostPlayerId ? (
                <Crown aria-label="Host" className="size-3.5 shrink-0 text-muted-foreground" />
              ) : null}
              {player.connected ? null : (
                <WifiOff aria-label="Disconnected" className="size-3.5 shrink-0 text-destructive" />
              )}
            </div>

            {finished ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Flag aria-hidden="true" className="size-3" />
                Finished
              </p>
            ) : null}

            {/* A dl may only hold dt/dd pairs (optionally wrapped in a div), so the
                icons live inside the dd rather than beside it. */}
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              {showClicks ? (
                <div>
                  <dt className="sr-only">Clicks</dt>
                  <dd className="flex items-center gap-1.5">
                    <MousePointerClick aria-hidden="true" className="size-3" />
                    {player.clickCount} click{player.clickCount === 1 ? '' : 's'}
                  </dd>
                </div>
              ) : null}

              {showCurrent && player.currentSlug !== undefined ? (
                <div>
                  <dt className="sr-only">Currently reading</dt>
                  <dd className="truncate text-foreground">{humanSlug(player.currentSlug)}</dd>
                </div>
              ) : null}

              {showPath && tail.length > 1 ? (
                <div className="hidden lg:block">
                  <dt className="sr-only">Recent route</dt>
                  <dd className="line-clamp-2 leading-snug">
                    {player.path.length > PATH_TAIL ? '… → ' : ''}
                    {tail.map((slug) => humanSlug(slug)).join(' → ')}
                  </dd>
                </div>
              ) : null}
            </dl>

            {showClicks || showCurrent ? null : (
              <p className="mt-2 text-xs italic text-muted-foreground">hidden by the host</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
