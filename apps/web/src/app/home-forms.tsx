'use client';

import { extractRoomCode, ROOM_CODE_LENGTH } from '@wikiconn/shared';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, type SyntheticEvent, useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, createRoom } from '@/lib/api';
import { getOrCreatePlayerId } from '@/lib/identity';

/** Typed input is filtered to the code alphabet; pasted links are kept intact for parsing. */
function normalizeCodeInput(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper.includes('/')) return upper;
  return upper.replaceAll(/[^A-Z2-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function HomeForms(): ReactNode {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [creating, setCreating] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  function onCreate(): void {
    if (creating) return;
    setCreating(true);
    createRoom({ hostPlayerId: getOrCreatePlayerId(), lang: 'en' })
      .then((result) => {
        router.push(`/room/${result.code}`);
        return result;
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : 'Could not create room');
        setCreating(false);
      });
  }

  function onJoin(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const code = extractRoomCode(joinInput);
    if (code === null) {
      setJoinError('That is not a valid code. Six characters, letters A–Z and digits 2–9.');
      return;
    }
    setJoinError(null);
    router.push(`/room/${code}`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="flex flex-col rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl tracking-tight">Start a new race</h2>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
          You become the host: you choose the language, the two articles and what everyone can see
          about each other mid-race.
        </p>
        <Button onClick={onCreate} disabled={creating} size="lg" className="mt-4 w-full">
          {creating ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {creating ? 'Creating room…' : 'Create room'}
        </Button>
      </section>

      <section className="flex flex-col rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl tracking-tight">Join a friend</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Paste the code you were given — or the whole invite link.
        </p>
        <form onSubmit={onJoin} className="mt-4 flex flex-1 flex-col justify-end gap-2">
          <Label htmlFor={inputId} className="sr-only">
            Room code
          </Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={joinInput}
              onChange={(event) => {
                setJoinInput(normalizeCodeInput(event.target.value));
                setJoinError(null);
              }}
              placeholder="ABCDEF"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={joinError !== null}
              aria-describedby={joinError === null ? undefined : errorId}
              className="h-11 font-mono text-base uppercase tracking-[0.3em] placeholder:tracking-[0.3em]"
            />
            <Button type="submit" variant="secondary" size="lg" className="shrink-0">
              Join
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <p
            id={errorId}
            role={joinError === null ? undefined : 'alert'}
            className="min-h-[1.25rem] text-xs text-destructive"
          >
            {joinError}
          </p>
        </form>
      </section>
    </div>
  );
}
