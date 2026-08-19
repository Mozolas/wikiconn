'use client';

import { type PlayerState } from '@wikiconn/shared';
import { Crown, WifiOff } from 'lucide-react';
import { type ReactNode } from 'react';

import { useDictionary } from '@/i18n/context';
import { initialGrapheme } from '@/lib/format';
import { racerAccentClass } from '@/lib/racer-accent';
import { cn } from '@/lib/utils';

interface Props {
  players: PlayerState[];
  hostPlayerId: string;
  selfPlayerId: string;
}

export function PlayersList({ players, hostPlayerId, selfPlayerId }: Props): ReactNode {
  const { lobby } = useDictionary();

  if (players.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">{lobby.waitingForPlayers}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {players.map((player, index) => (
        <li
          key={player.playerId}
          className={cn(
            racerAccentClass(index),
            'flex items-center gap-2.5 rounded-sm border px-2.5 py-2',
            player.playerId === selfPlayerId ? 'border-primary/50 bg-accent/40' : 'border-border',
          )}
        >
          <span className="racer-avatar flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase">
            {initialGrapheme(player.nickname)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {player.nickname}
            {player.playerId === selfPlayerId ? (
              <span className="ml-1 font-normal text-muted-foreground">{lobby.you}</span>
            ) : null}
          </span>
          {player.connected ? null : (
            <WifiOff aria-label={lobby.disconnected} className="size-3.5 text-muted-foreground" />
          )}
          {player.playerId === hostPlayerId ? (
            <span className="flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
              <Crown aria-hidden="true" className="size-3" />
              {lobby.host}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
