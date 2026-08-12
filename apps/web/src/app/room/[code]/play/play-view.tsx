'use client';

import { type WikiArticleResponse } from '@wikiconn/shared';
import { AlertTriangle, Loader2, LogOut, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EndGame } from '@/components/end-game';
import { FatalNotice } from '@/components/fatal-notice';
import { ArticleToc } from '@/components/game/article-toc';
import { ArticleView } from '@/components/game/article-view';
import { RacerPanel } from '@/components/game/racer-panel';
import { WikiHeader } from '@/components/game/wiki-header';
import { SiteShell } from '@/components/site-shell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ApiError, fetchArticle } from '@/lib/api';
import { extractToc } from '@/lib/article-toc';
import { getOrCreatePlayerId, getOrCreatePlayerSecret, getStoredNickname } from '@/lib/identity';
import { useRoomConnection, useRoomStore } from '@/lib/room-store';
import { useMounted } from '@/lib/use-mounted';
import { useSettledFlag } from '@/lib/use-settled-flag';
import { useStopwatch } from '@/lib/use-stopwatch';

interface Props {
  code: string;
}

/** How long the socket must stay down before the player is told about it. */
const RECONNECT_NOTICE_DELAY_MS = 1200;

export function PlayView({ code }: Props): ReactNode {
  const router = useRouter();
  const mounted = useMounted();
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [playerSecret] = useState<string>(() => getOrCreatePlayerSecret());
  const [nickname] = useState<string | null>(() => {
    const stored = getStoredNickname();
    return stored !== null && stored.trim().length > 0 ? stored : null;
  });

  const client = useRoomConnection({ code, playerId, playerSecret, nickname });
  const { room, lastWonPayload, lastError, connected } = useRoomStore();

  const self = room?.players.find((player) => player.playerId === playerId) ?? null;
  const currentSlug = self?.currentSlug ?? null;
  const lang = room?.settings.lang ?? 'en';
  const finishSlug = room?.settings.finishSlug;
  const elapsed = useStopwatch(room?.startedAt, room?.status === 'playing');

  const [article, setArticle] = useState<WikiArticleResponse | null>(null);
  const [articleError, setArticleError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Which round's results the player has closed; `null` means "show them again".
  const [dismissedRound, setDismissedRound] = useState<number | 'current' | null>(null);

  const finished = room?.status === 'finished';
  const round = room?.startedAt ?? 'current';
  const resultsOpen = finished && dismissedRound !== round;

  useEffect(() => {
    if (room?.status === 'lobby') router.replace(`/room/${code}`);
  }, [code, room?.status, router]);

  useEffect(() => {
    if (mounted && nickname === null) router.replace(`/room/${code}`);
  }, [code, mounted, nickname, router]);

  useEffect(() => {
    if (currentSlug === null) return;
    const controller = new AbortController();
    fetchArticle(lang, currentSlug, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setArticle(data);
          setArticleError(false);
        }
        return data;
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setArticleError(true);
        toast.error(error instanceof ApiError ? error.message : 'Could not load article');
      });
    return () => {
      controller.abort();
    };
  }, [currentSlug, lang, reloadKey]);

  const loadedSlug = article?.slug;
  useEffect(() => {
    if (loadedSlug === undefined) return;
    globalThis.window.scrollTo({ top: 0, behavior: 'instant' });
  }, [loadedSlug]);

  const toc = useMemo(() => extractToc(article?.html ?? ''), [article?.html]);

  const reconnecting = useSettledFlag(!connected, RECONNECT_NOTICE_DELAY_MS);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  // Depends on the two fields it reads rather than the whole room object, whose
  // identity changes on every broadcast — that identity would otherwise make the
  // article subtree re-render every time an opponent so much as clicks.
  const roomStatus = room?.status;
  const onNavigate = useCallback(
    (toSlug: string) => {
      if (currentSlug === null || roomStatus !== 'playing') return;
      client.navigate({ code, playerId, fromSlug: currentSlug, toSlug });
    },
    [client, code, currentSlug, playerId, roomStatus],
  );

  if (room === null) {
    if (
      lastError !== null &&
      (lastError.code === 'ROOM_NOT_FOUND' || lastError.code === 'GAME_NOT_RUNNING')
    ) {
      return (
        <SiteShell>
          <FatalNotice
            title={lastError.code === 'ROOM_NOT_FOUND' ? 'Room not found' : 'Game not running'}
            message={lastError.message}
          />
        </SiteShell>
      );
    }
    return (
      <SiteShell>
        <div className="flex h-72 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Joining the race…
        </div>
      </SiteShell>
    );
  }

  const racers = (
    <RacerPanel
      players={room.players}
      hostPlayerId={room.hostPlayerId}
      selfPlayerId={playerId}
      visibility={room.settings.visibility}
    />
  );

  return (
    <div className="min-h-screen">
      <WikiHeader
        targetSlug={finishSlug}
        elapsedMs={elapsed}
        clickCount={self?.clickCount ?? 0}
        finished={self?.finishedAt !== undefined}
        loading={article !== null && article.slug !== currentSlug}
      />

      {/* Fixed, not in flow: a dropped socket must never reflow the article a
          player is mid-click on, and a blip that heals in under a second is not
          worth telling them about at all. */}
      {reconnecting ? (
        <p
          role="status"
          className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-wiki-warning-surface px-4 py-1.5 text-sm text-foreground shadow-lg"
        >
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Connection lost — reconnecting…
        </p>
      ) : null}

      <EndGame
        open={resultsOpen}
        room={room}
        payload={lastWonPayload}
        selfPlayerId={playerId}
        onPlayAgain={() => {
          client.resetGame(code);
        }}
        onDismiss={() => {
          setDismissedRound(round);
        }}
      />

      <div className="mx-auto flex w-full max-w-[100rem] gap-6 px-3 py-5 sm:px-6 lg:gap-8">
        <div className="hidden w-52 shrink-0 xl:block">
          <ArticleToc entries={toc} />
        </div>

        <main id="main" className="min-w-0 flex-1">
          <section aria-label="Racers" className="mb-4 lg:hidden">
            {racers}
          </section>

          {article === null ? (
            articleError ? (
              <ArticleProblem onRetry={retry} />
            ) : (
              <ArticleSkeleton />
            )
          ) : (
            <>
              {articleError ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle aria-hidden="true" className="size-4 text-destructive" />
                    That article could not be opened — you are still on the previous one.
                  </span>
                  <Button variant="outline" size="sm" onClick={retry}>
                    Try again
                  </Button>
                </div>
              ) : null}
              <ArticleView
                title={article.title}
                html={article.html}
                lang={article.lang}
                busy={article.slug !== currentSlug}
                onNavigate={onNavigate}
              />
            </>
          )}
        </main>

        <aside className="hidden w-72 shrink-0 space-y-6 lg:block">
          <section>
            <h2 className="border-b border-border pb-1.5 text-sm font-semibold tracking-tight">
              Racers ({room.players.length})
            </h2>
            <div className="mt-2">{racers}</div>
          </section>

          {finished && !resultsOpen ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setDismissedRound(null);
              }}
            >
              <Trophy aria-hidden="true" />
              Show results
            </Button>
          ) : null}

          <section>
            <h2 className="border-b border-border pb-1.5 text-sm font-semibold tracking-tight">
              Appearance
            </h2>
            <div className="mt-2">
              <ThemeToggle />
            </div>
          </section>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              client.leave(code, playerId);
              router.push('/');
            }}
          >
            <LogOut aria-hidden="true" />
            Leave the race
          </Button>
        </aside>
      </div>
    </div>
  );
}

const SKELETON_LINES = ['w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-full', 'w-3/4'] as const;

function ArticleSkeleton(): ReactNode {
  return (
    <div
      className="rounded-sm border border-border bg-card px-5 py-6 sm:px-8 sm:py-7"
      aria-busy="true"
      aria-label="Loading article"
    >
      <div className="h-8 w-2/3 animate-pulse rounded-sm bg-secondary" />
      <div className="mt-4 space-y-2.5 border-t border-border pt-4">
        {SKELETON_LINES.map((width, index) => (
          <div
            // A fixed decorative list: nothing reorders, so the index is the identity.
            key={index}
            className={`h-3.5 animate-pulse rounded-sm bg-secondary ${width}`}
          />
        ))}
      </div>
    </div>
  );
}

function ArticleProblem({ onRetry }: { onRetry: () => void }): ReactNode {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card text-muted-foreground">
      <AlertTriangle aria-hidden="true" className="size-6 text-destructive" />
      <p className="text-sm">This article could not be loaded.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
