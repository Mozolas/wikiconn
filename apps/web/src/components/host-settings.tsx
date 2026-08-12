'use client';

import {
  type Language,
  MIN_PLAYERS_TO_START,
  type RoomState,
  slugsEqual,
  SUPPORTED_LANGUAGES,
  type VisibilitySettings,
} from '@wikiconn/shared';
import { ArrowRight, Flag, Lock, MapPin, Play } from 'lucide-react';
import { type ReactNode } from 'react';

import { ArticlePicker } from '@/components/article-picker';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { humanSlug } from '@/lib/format';
import { getRoomClient } from '@/lib/room-store';
import { cn } from '@/lib/utils';

interface Props {
  room: RoomState;
  selfPlayerId: string;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English Wikipedia',
  cs: 'Česká Wikipedie',
};

const VISIBILITY_ROWS = [
  {
    key: 'showCurrentArticle',
    label: 'Current article',
    description: 'Everyone sees which article each racer is reading right now.',
  },
  {
    key: 'showClickCount',
    label: 'Click count',
    description: 'Everyone sees how many links each racer has followed.',
  },
  {
    key: 'showFullPath',
    label: 'Live route',
    description: 'Every hop appears for everyone the moment it happens.',
  },
] as const;

export function HostSettings({ room, selfPlayerId }: Props): ReactNode {
  const client = getRoomClient();
  const isHost = room.hostPlayerId === selfPlayerId;
  const { lang, startSlug, finishSlug, visibility } = room.settings;
  const playerCount = room.players.length;

  function update(patch: Parameters<typeof client.updateSettings>[1]): void {
    client.updateSettings(room.code, patch);
  }

  function toggleVisibility(key: keyof VisibilitySettings, checked: boolean): void {
    update({ visibility: { ...visibility, [key]: checked } });
  }

  const bothPicked = startSlug !== undefined && finishSlug !== undefined;
  const sameArticle = bothPicked && slugsEqual(startSlug, finishSlug);
  const missingPlayers = Math.max(0, MIN_PLAYERS_TO_START - playerCount);
  const canStart = isHost && bothPicked && !sameArticle && missingPlayers === 0;

  let blocker: string | null = null;
  if (!bothPicked) blocker = 'Pick a start and a finish article.';
  else if (sameArticle) blocker = 'Start and finish have to be different articles.';
  else if (missingPlayers > 0) {
    blocker = `Waiting for ${String(missingPlayers)} more player${missingPlayers === 1 ? '' : 's'}…`;
  }

  return (
    <div className="space-y-6">
      <fieldset disabled={!isHost} className="space-y-2">
        <legend className="text-sm font-medium">Wikipedia edition</legend>
        <p className="text-xs text-muted-foreground">
          Changing this clears both articles — search results differ per language.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {SUPPORTED_LANGUAGES.map((code) => (
            <label
              key={code}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors',
                lang === code
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border hover:bg-secondary',
                !isHost && 'cursor-default opacity-70',
              )}
            >
              <input
                type="radio"
                name="wiki-language"
                value={code}
                checked={lang === code}
                onChange={() => {
                  update({ lang: code, startSlug: null, finishSlug: null });
                }}
                className="size-4 accent-primary"
              />
              {LANGUAGE_LABELS[code]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <ArticlePicker
            id="start-article"
            label="Start article"
            hint="Where every racer begins."
            lang={lang}
            value={startSlug}
            disabled={!isHost}
            onChange={(slug) => {
              update({ startSlug: slug });
            }}
          />
          <ArticlePicker
            id="finish-article"
            label="Finish article"
            hint="First racer to open it wins."
            lang={lang}
            value={finishSlug}
            disabled={!isHost}
            onChange={(slug) => {
              update({ finishSlug: slug });
            }}
          />
        </div>

        {bothPicked ? (
          <p className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-muted px-3 py-2 text-sm">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{humanSlug(startSlug)}</span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <Flag aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span className="font-medium">{humanSlug(finishSlug)}</span>
          </p>
        ) : null}
      </div>

      <fieldset disabled={!isHost} className="space-y-2">
        <legend className="text-sm font-medium">What racers see about each other</legend>
        <div className="space-y-2 pt-1">
          {VISIBILITY_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 rounded-sm border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <Switch
                checked={visibility[row.key]}
                disabled={!isHost}
                aria-label={row.label}
                onCheckedChange={(checked) => {
                  toggleVisibility(row.key, checked);
                }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          When the race ends everyone always sees every route in full — that part is not optional.
        </p>
      </fieldset>

      {isHost ? (
        <div className="space-y-2">
          <Button
            onClick={() => {
              client.startGame(room.code);
            }}
            disabled={!canStart}
            size="lg"
            className="w-full"
          >
            <Play aria-hidden="true" />
            Start the race
          </Button>
          {blocker === null ? null : (
            <p className="text-center text-xs text-muted-foreground">{blocker}</p>
          )}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="size-4" />
          Only the host can change these. The race starts for everyone at once.
        </p>
      )}
    </div>
  );
}
