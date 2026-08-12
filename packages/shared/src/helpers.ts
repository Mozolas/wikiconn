import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_REGEX,
} from './constants.js';

export function isValidNickname(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= NICKNAME_MIN_LENGTH && trimmed.length <= NICKNAME_MAX_LENGTH;
}

export function isValidRoomCode(value: unknown): value is string {
  return typeof value === 'string' && ROOM_CODE_REGEX.test(value);
}

const ROOM_CODE_IN_URL = new RegExp(`/ROOM/([${ROOM_CODE_ALPHABET}]{${String(ROOM_CODE_LENGTH)}})`);

/**
 * Recover a room code from whatever the player pasted: the bare code, or a full
 * invite link. Returns null when there is no usable code in the input.
 */
export function extractRoomCode(input: string): string | null {
  const upper = input.trim().toUpperCase();
  if (isValidRoomCode(upper)) return upper;
  return ROOM_CODE_IN_URL.exec(upper)?.[1] ?? null;
}

export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    const idx = byte % ROOM_CODE_ALPHABET.length;
    code += ROOM_CODE_ALPHABET.charAt(idx);
  }
  return code;
}

/**
 * Normalize a Wikipedia slug to the canonical underscored form.
 * Strips Parsoid's `./` prefix, decodes percent-encoding, replaces spaces with underscores,
 * and removes any URL fragment.
 */
export function parseSlug(input: string): string {
  let slug = input.trim();
  if (slug.startsWith('./')) slug = slug.slice(2);
  if (slug.startsWith('/wiki/')) slug = slug.slice(6);
  const hashIndex = slug.indexOf('#');
  if (hashIndex !== -1) slug = slug.slice(0, hashIndex);
  const queryIndex = slug.indexOf('?');
  if (queryIndex !== -1) slug = slug.slice(0, queryIndex);
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep raw on decode failure */
  }
  return slug.replaceAll(' ', '_');
}

export function slugsEqual(a: string, b: string): boolean {
  return parseSlug(a) === parseSlug(b);
}
