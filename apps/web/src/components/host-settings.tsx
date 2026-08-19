'use client';

import {
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
import { useDictionary, usePlural } from '@/i18n/context';
import { humanSlug } from '@/lib/format';
import { getRoomClient } from '@/lib/room-store';
import { cn } from '@/lib/utils';

interface Props {
  room: RoomState;
  selfPlayerId: string;
}

const VISIBILITY_KEYS = [
  'showCurrentArticle',
  'showClickCount',
  'showFullPath',
] as const satisfies readonly (keyof VisibilitySettings)[];

export function HostSettings({ room, selfPlayerId }: Props): ReactNode {
  const dict = useDictionary().settings;
  const pluralize = usePlural();
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
  if (!bothPicked) blocker = dict.blockerPickBoth;
  else if (sameArticle) blocker = dict.blockerSameArticle;
  else if (missingPlayers > 0) blocker = pluralize(dict.blockerWaiting, missingPlayers);

  return (
    <div className="space-y-6">
      <fieldset disabled={!isHost} className="space-y-2">
        <legend className="text-sm font-medium">{dict.editionLegend}</legend>
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
              {dict.editionNames[code]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <ArticlePicker
            id="start-article"
            label={dict.startLabel}
            hint={dict.startHint}
            lang={lang}
            value={startSlug}
            disabled={!isHost}
            onChange={(slug) => {
              update({ startSlug: slug });
            }}
          />
          <ArticlePicker
            id="finish-article"
            label={dict.finishLabel}
            hint={dict.finishHint}
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
        <legend className="text-sm font-medium">{dict.visibilityLegend}</legend>
        <div className="space-y-2 pt-1">
          {VISIBILITY_KEYS.map((key) => {
            const row = dict.visibilityRows[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-sm border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.description}</p>
                </div>
                <Switch
                  checked={visibility[key]}
                  disabled={!isHost}
                  aria-label={row.label}
                  onCheckedChange={(checked) => {
                    toggleVisibility(key, checked);
                  }}
                />
              </div>
            );
          })}
        </div>
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
            {dict.startRace}
          </Button>
          {blocker === null ? null : (
            <p className="text-center text-xs text-muted-foreground">{blocker}</p>
          )}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="size-4" />
          {dict.guestNote}
        </p>
      )}
    </div>
  );
}
