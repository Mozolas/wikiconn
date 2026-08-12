import { afterEach, describe, expect, it } from 'vitest';

import {
  clearStoredNickname,
  getOrCreatePlayerId,
  getStoredNickname,
  setStoredNickname,
} from './identity';

afterEach(() => {
  globalThis.window.localStorage.clear();
});

describe('identity helpers', () => {
  it('creates a stable playerId on first call and reuses it later', () => {
    const first = getOrCreatePlayerId();
    expect(first).toMatch(/^[\da-f-]{36}$/i);
    const second = getOrCreatePlayerId();
    expect(second).toBe(first);
  });

  it('stores and retrieves the nickname', () => {
    setStoredNickname('alice');
    expect(getStoredNickname()).toBe('alice');
    clearStoredNickname();
    expect(getStoredNickname()).toBeNull();
  });
});
