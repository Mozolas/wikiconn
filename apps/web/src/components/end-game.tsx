'use client';

import { type FinalPlayerState, type GameWonPayload, type RoomState } from '@wikiconn/shared';
import { Crown, MousePointerClick, Timer, Trophy } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDictionary, usePlural } from '@/i18n/context';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { format, type PluralForms } from '@/i18n/plural';
import { formatDuration, humanSlug, initialGrapheme } from '@/lib/format';
import { racerAccentClass } from '@/lib/racer-accent';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  room: RoomState;
  payload: GameWonPayload | null;
  selfPlayerId: string;
  onPlayAgain: () => void;
  onDismiss: () => void;
}

interface RankedRow {
  playerId: string;
  nickname: string;
  clickCount: number;
  path: string[];
  durationMs: number | undefined;
  finishedAt: number | undefined;
}

export function EndGame({
  open,
  room,
  payload,
  selfPlayerId,
  onPlayAgain,
  onDismiss,
}: Props): ReactNode {
  const { endGame, lobby, play } = useDictionary();
  const pluralize = usePlural();
  const isHost = room.hostPlayerId === selfPlayerId;
  const winner: FinalPlayerState | null =
    payload === null ? null : (payload.finalStates[payload.winnerId] ?? null);

  const rows: RankedRow[] =
    payload === null
      ? room.players.map<RankedRow>((player) => ({
          playerId: player.playerId,
          nickname: player.nickname,
          clickCount: player.clickCount,
          path: player.path,
          durationMs: undefined,
          finishedAt: player.finishedAt,
        }))
      : Object.values(payload.finalStates).map<RankedRow>((player) => ({
          playerId: player.playerId,
          nickname: player.nickname,
          clickCount: player.clickCount,
          path: player.path,
          durationMs: player.durationMs,
          finishedAt: player.finishedAt,
        }));

  const winnerId = payload?.winnerId;
  const ordered = rows.toSorted((a, b) => {
    // The server's winner is always first, so the "#1" badge can never disagree with the crown.
    if (winnerId !== undefined) {
      if (a.playerId === winnerId) return -1;
      if (b.playerId === winnerId) return 1;
    }
    const aTime = a.finishedAt ?? Number.POSITIVE_INFINITY;
    const bTime = b.finishedAt ?? Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return a.clickCount - b.clickCount;
  });

  // Seat order in the room, so the colours match the panel players raced with.
  const seatOf = new Map(room.players.map((player, index) => [player.playerId, index]));

  useEffect(() => {
    if (!open) return;
    // Loaded on the win rather than on the route: most of a race happens with
    // this dialog closed.
    void import('canvas-confetti').then(({ default: confetti }) =>
      confetti({
        particleCount: 40,
        spread: 55,
        startVelocity: 35,
        origin: { y: 0.7 },
        disableForReducedMotion: true,
      }),
    );
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mx-auto mb-1 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy aria-hidden="true" className="size-5" />
          </div>
          <DialogTitle className="text-center font-serif text-2xl">
            {winner === null
              ? endGame.raceOver
              : format(endGame.winnerTitle, { nickname: winner.nickname })}
          </DialogTitle>
          <DialogDescription className="text-center">
            {payload === null || winner === null
              ? endGame.ended
              : format(endGame.winnerLine, {
                  target: humanSlug(room.settings.finishSlug ?? ''),
                  duration: formatDuration(payload.durationMs),
                  clicks: pluralize(play.clicks, winner.clickCount),
                })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {ordered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{endGame.noPlayers}</p>
          ) : null}

          {ordered.map((row, rank) => (
            <ResultCard
              key={row.playerId}
              row={row}
              rank={rank}
              isWinner={row.playerId === winnerId}
              isSelf={row.playerId === selfPlayerId}
              accent={racerAccentClass(seatOf.get(row.playerId) ?? rank)}
              dict={{ endGame, lobby, play }}
              pluralize={pluralize}
            />
          ))}
        </div>

        <DialogFooter>
          {isHost ? (
            <Button onClick={onPlayAgain} className="w-full sm:w-auto">
              {endGame.raceAgain}
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              {endGame.waitingForHost}
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ResultCardCopy {
  endGame: Dictionary['endGame'];
  lobby: Dictionary['lobby'];
  play: Dictionary['play'];
}

function ResultCard({
  row,
  rank,
  isWinner,
  isSelf,
  accent,
  dict,
  pluralize,
}: {
  row: RankedRow;
  rank: number;
  isWinner: boolean;
  isSelf: boolean;
  accent: string;
  dict: ResultCardCopy;
  pluralize: (forms: PluralForms, count: number) => string;
}): ReactNode {
  return (
    <section
      className={cn(
        accent,
        'rounded-sm border bg-card p-3',
        isWinner ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center font-mono text-sm text-muted-foreground">
          {rank + 1}
        </span>
        <span className="racer-avatar flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase">
          {initialGrapheme(row.nickname)}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {row.nickname}
          {isSelf ? <span className="ml-1 text-muted-foreground">{dict.lobby.you}</span> : null}
        </span>
        {isWinner ? (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Crown aria-hidden="true" className="size-3.5" />
            {dict.endGame.winner}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MousePointerClick aria-hidden="true" className="size-3" />
          {pluralize(dict.play.clicks, row.clickCount)}
        </span>
        {row.durationMs === undefined ? null : (
          <span className="flex items-center gap-1">
            <Timer aria-hidden="true" className="size-3" />
            {formatDuration(row.durationMs)}
          </span>
        )}
        {row.finishedAt === undefined ? <span>{dict.endGame.didNotFinish}</span> : null}
      </div>

      {row.path.length > 0 ? (
        <div className="mt-3 pl-8">
          <p className="mb-1.5 text-xs text-muted-foreground">
            {pluralize(dict.endGame.route, row.path.length)}
          </p>
          <ol className="space-y-1 border-l border-border pl-3.5">
            {row.path.map((slug, index) => {
              const isStart = index === 0;
              const isFinish = index === row.path.length - 1 && row.finishedAt !== undefined;
              return (
                <li key={`${row.playerId}-${String(index)}-${slug}`} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute -left-[1.19rem] top-1.5 size-2 rounded-full ring-2 ring-card',
                      isStart || isFinish ? 'racer-dot' : 'bg-border',
                    )}
                  />
                  <span className="flex items-baseline gap-2 text-xs">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={cn(isFinish && 'font-semibold')}>{humanSlug(slug)}</span>
                    {isStart ? (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {dict.endGame.start}
                      </span>
                    ) : null}
                    {isFinish ? (
                      <span className="text-[10px] uppercase tracking-wider text-primary">
                        {dict.endGame.finish}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
