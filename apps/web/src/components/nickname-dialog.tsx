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
import { useDictionary } from '@/i18n/context';
import { format } from '@/i18n/plural';

interface Props {
  open: boolean;
  defaultNickname?: string;
  onSubmit: (nickname: string) => void;
}

export function NicknameDialog({ open, defaultNickname = '', onSubmit }: Props): ReactNode {
  const dict = useDictionary().nickname;
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
            <DialogTitle className="font-serif text-xl">{dict.title}</DialogTitle>
            <DialogDescription>{dict.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="nickname">{dict.label}</Label>
            <Input
              id="nickname"
              value={nickname}
              autoComplete="nickname"
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder={dict.placeholder}
              onChange={(event) => {
                setNickname(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {format(dict.hint, { min: NICKNAME_MIN_LENGTH, max: NICKNAME_MAX_LENGTH })}
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!valid} className="w-full sm:w-auto">
              {dict.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
