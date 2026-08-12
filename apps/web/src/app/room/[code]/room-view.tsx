'use client';

import { type ErrorCode, MAX_PLAYERS } from '@wikiconn/shared';
import { Check, Copy, Link2, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FatalNotice } from '@/components/fatal-notice';
import { HostSettings } from '@/components/host-settings';
import { NicknameDialog } from '@/components/nickname-dialog';
import { Panel } from '@/components/panel';
import { PlayersList } from '@/components/players-list';
import { SiteShell } from '@/components/site-shell';
import { Button } from '@/components/ui/button';
import { copyText } from '@/lib/clipboard';
import {
  clearStoredNickname,
  getOrCreatePlayerId,
  getOrCreatePlayerSecret,
  getStoredNickname,
  setStoredNickname,
} from '@/lib/identity';
import { useRoomConnection, useRoomStore } from '@/lib/room-store';
import { useMounted } from '@/lib/use-mounted';

interface Props {
  code: string;
}

const FATAL_JOIN_TITLES: Partial<Record<ErrorCode, string>> = {
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_FULL: 'Room is full',
  GAME_ALREADY_STARTED: 'Game already in progress',
  NICKNAME_TAKEN: 'Nickname taken',
  IDENTITY_MISMATCH: 'Identity conflict',
};

export function RoomView({ code }: Props): ReactNode {
  const router = useRouter();
  const mounted = useMounted();
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [playerSecret] = useState<string>(() => getOrCreatePlayerSecret());
  const [nickname, setNickname] = useState<string | null>(() => {
    const stored = getStoredNickname();
    return stored !== null && stored.trim().length > 0 ? stored : null;
  });

  const client = useRoomConnection({ code, playerId, playerSecret, nickname });
  const { room, connected, lastError } = useRoomStore();

  const fatalError =
    room === null && lastError !== null && lastError.code in FATAL_JOIN_TITLES ? lastError : null;

  useEffect(() => {
    if (room?.status === 'playing') router.replace(`/room/${code}/play`);
  }, [code, room?.status, router]);

  if (fatalError !== null) {
    return (
      <SiteShell>
        <FatalNotice
          title={FATAL_JOIN_TITLES[fatalError.code] ?? 'Cannot join this room'}
          message={fatalError.message}
          action={
            fatalError.code === 'NICKNAME_TAKEN' ? (
              <Button
                className="w-full"
                onClick={() => {
                  clearStoredNickname();
                  setNickname(null);
                }}
              >
                Pick a different nickname
              </Button>
            ) : undefined
          }
        />
      </SiteShell>
    );
  }

  const players = room?.players ?? [];
  const isHost = room !== null && room.hostPlayerId === playerId;

  return (
    <SiteShell>
      <NicknameDialog
        open={mounted && playerId.length > 0 && nickname === null}
        onSubmit={(value) => {
          setStoredNickname(value);
          setNickname(value);
        }}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl tracking-tight">Race lobby</h1>
          <p className="text-sm text-muted-foreground">
            {isHost
              ? 'You are the host. Set the route, then start when everyone is in.'
              : 'The host is setting up the route. Sit tight — the race starts for everyone at once.'}
          </p>
        </div>

        <InvitePanel code={code} connected={connected} />

        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <Panel title="Race settings">
            {room === null ? (
              <div className="flex h-56 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Loading room…
              </div>
            ) : (
              <HostSettings room={room} selfPlayerId={playerId} />
            )}
          </Panel>

          <aside className="space-y-3">
            <Panel
              title="Players"
              aside={
                <span className="text-xs text-muted-foreground">
                  {players.length}/{MAX_PLAYERS}
                </span>
              }
              bodyClassName="p-3"
            >
              <PlayersList
                players={players}
                hostPlayerId={room?.hostPlayerId ?? ''}
                selfPlayerId={playerId}
              />
            </Panel>

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
              Leave room
            </Button>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}

function InvitePanel({ code, connected }: { code: string; connected: boolean }): ReactNode {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  function copy(kind: 'code' | 'link'): void {
    const value = kind === 'code' ? code : `${globalThis.location.origin}/room/${code}`;
    void copyText(value).then((ok) => {
      if (!ok) {
        toast.error(`Copying is blocked here — the ${kind} is ${value}`);
        return ok;
      }
      setCopied(kind);
      globalThis.setTimeout(() => {
        setCopied(null);
      }, 2000);
      return ok;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-md border border-border bg-card p-4 sm:p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Room code
        </p>
        <p className="font-mono text-3xl font-bold tracking-[0.3em] sm:text-4xl">{code}</p>
      </div>

      <div className="flex flex-wrap gap-2 sm:ml-auto">
        <Button
          variant="outline"
          onClick={() => {
            copy('code');
          }}
        >
          {copied === 'code' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied === 'code' ? 'Copied' : 'Copy code'}
        </Button>
        <Button
          onClick={() => {
            copy('link');
          }}
        >
          {copied === 'link' ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          {copied === 'link' ? 'Copied' : 'Copy invite link'}
        </Button>
      </div>

      <p
        role="status"
        className="flex w-full items-center gap-1.5 text-xs text-muted-foreground sm:w-auto"
      >
        {connected ? (
          <>
            <span className="size-2 rounded-full bg-wiki-success" aria-hidden="true" />
            Connected
          </>
        ) : (
          <>
            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            Connecting…
          </>
        )}
      </p>
    </div>
  );
}
