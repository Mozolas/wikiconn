'use client';

import { useEffect, useState } from 'react';

export function useStopwatch(startedAt: number | undefined, running: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!running || startedAt === undefined) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      clearInterval(interval);
    };
  }, [running, startedAt]);

  if (startedAt === undefined) return 0;
  return Math.max(0, now - startedAt);
}
