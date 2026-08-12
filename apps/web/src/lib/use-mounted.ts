'use client';

import { useSyncExternalStore } from 'react';

const noop = (): void => {
  /* identity never changes after mount */
};
const subscribe = (): (() => void) => noop;
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

/**
 * Returns false during SSR and the first (hydration) client render, then true.
 * Lets components defer client-only reads (localStorage identity) without a
 * hydration mismatch and without calling setState inside an effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
