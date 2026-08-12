'use client';

import { useEffect, useState } from 'react';

/**
 * Mirrors a flag, but only reports true once it has held for `delayMs`.
 * A socket that drops and reconnects within a moment should not flash a warning
 * at the player — and, more importantly, should not reflow the page under their
 * finger while they are reading.
 */
export function useSettledFlag(value: boolean, delayMs: number): boolean {
  const [settled, setSettled] = useState(false);
  const [previous, setPrevious] = useState(value);

  // Adjusting state during render rather than in an effect: the reset has to
  // land in the same pass that turned the flag off, or the caller would paint
  // one frame of a warning that is already over.
  if (previous !== value) {
    setPrevious(value);
    if (!value) setSettled(false);
  }

  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => {
      setSettled(true);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return settled && value;
}
