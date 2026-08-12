const PLAYER_ID_KEY = 'wikiconn:playerId';
const PLAYER_SECRET_KEY = 'wikiconn:playerSecret';
const NICKNAME_KEY = 'wikiconn:nickname';

function getStorage(): Storage | null {
  try {
    if (!('window' in globalThis)) return null;
    return globalThis.window.localStorage;
  } catch {
    // Private mode / blocked storage.
    return null;
  }
}

/**
 * Generate a v4 UUID. Falls back to getRandomValues / Math.random when
 * crypto.randomUUID is unavailable (insecure contexts, e.g. plain-HTTP LAN play),
 * so the result still satisfies the server's v4 UUID schema.
 */
function randomUuidV4(): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getOrCreate(key: string): string {
  // On the server there is no stable identity; defer to the client render.
  if (!('window' in globalThis)) return '';
  const storage = getStorage();
  if (storage === null) return randomUuidV4();
  try {
    const existing = storage.getItem(key);
    if (existing !== null && existing.length > 0) return existing;
    const fresh = randomUuidV4();
    storage.setItem(key, fresh);
    return fresh;
  } catch {
    // Quota / security error — fall back to an in-memory identity for this session.
    return randomUuidV4();
  }
}

export function getOrCreatePlayerId(): string {
  return getOrCreate(PLAYER_ID_KEY);
}

export function getOrCreatePlayerSecret(): string {
  return getOrCreate(PLAYER_SECRET_KEY);
}

export function getStoredNickname(): string | null {
  return getStorage()?.getItem(NICKNAME_KEY) ?? null;
}

export function setStoredNickname(nickname: string): void {
  try {
    getStorage()?.setItem(NICKNAME_KEY, nickname);
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredNickname(): void {
  try {
    getStorage()?.removeItem(NICKNAME_KEY);
  } catch {
    // ignore quota / private mode
  }
}
