'use client';

import { extractRoomCode, ROOM_CODE_LENGTH } from '@wikiconn/shared';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, type SyntheticEvent, useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { localePath } from '@/i18n/config';
import { useDictionary, useLocale } from '@/i18n/context';
import { describeApiError } from '@/i18n/error-copy';
import { createRoom } from '@/lib/api';
import { getOrCreatePlayerId } from '@/lib/identity';

/** Typed input is filtered to the code alphabet; pasted links are kept intact for parsing. */
function normalizeCodeInput(raw: string): string {
  const upper = raw.toUpperCase();
  if (upper.includes('/')) return upper;
  return upper.replaceAll(/[^A-Z2-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function HomeForms(): ReactNode {
  const { home, errors } = useDictionary();
  const { create, join } = home;
  const locale = useLocale();
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
        router.push(localePath(locale, `/room/${result.code}`));
        return result;
      })
      .catch((error: unknown) => {
        toast.error(describeApiError(errors, error, create.failed));
        setCreating(false);
      });
  }

  function onJoin(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const code = extractRoomCode(joinInput);
    if (code === null) {
      setJoinError(join.invalid);
      return;
    }
    setJoinError(null);
    router.push(localePath(locale, `/room/${code}`));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="flex flex-col rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl tracking-tight">{create.heading}</h2>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{create.body}</p>
        <Button onClick={onCreate} disabled={creating} size="lg" className="mt-4 w-full">
          {creating ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {creating ? create.busy : create.button}
        </Button>
      </section>

      <section className="flex flex-col rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-xl tracking-tight">{join.heading}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{join.body}</p>
        <form onSubmit={onJoin} className="mt-4 flex flex-1 flex-col justify-end gap-2">
          <Label htmlFor={inputId} className="sr-only">
            {join.label}
          </Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={joinInput}
              onChange={(event) => {
                setJoinInput(normalizeCodeInput(event.target.value));
                setJoinError(null);
              }}
              placeholder={join.placeholder}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={joinError !== null}
              aria-describedby={joinError === null ? undefined : errorId}
              className="h-11 font-mono text-base uppercase tracking-[0.3em] placeholder:tracking-[0.3em]"
            />
            <Button type="submit" variant="secondary" size="lg" className="shrink-0">
              {join.submit}
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
