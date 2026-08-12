'use client';

import { isValidNickname, NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from '@wikiconn/shared';
import { type ReactNode, type SyntheticEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  defaultNickname?: string;
  onSubmit: (nickname: string) => void;
}

export function NicknameDialog({ open, defaultNickname = '', onSubmit }: Props): ReactNode {
  const [nickname, setNickname] = useState(defaultNickname);
  const trimmed = nickname.trim();
  const valid = isValidNickname(trimmed);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (valid) onSubmit(trimmed);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">What should we call you?</DialogTitle>
            <DialogDescription>
              This is the name the other racers see. It is kept in this browser only — no account,
              no email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              autoComplete="nickname"
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder="Ada"
              onChange={(event) => {
                setNickname(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {NICKNAME_MIN_LENGTH}–{NICKNAME_MAX_LENGTH} characters.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!valid} className="w-full sm:w-auto">
              Enter the room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
