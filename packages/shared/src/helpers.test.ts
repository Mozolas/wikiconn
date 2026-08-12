import { describe, expect, it } from 'vitest';

import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';
import {
  extractRoomCode,
  generateRoomCode,
  isValidNickname,
  isValidRoomCode,
  parseSlug,
  slugsEqual,
} from './helpers.js';

describe('isValidNickname', () => {
  it('accepts valid lengths', () => {
    expect(isValidNickname('abc')).toBe(true);
    expect(isValidNickname('a'.repeat(20))).toBe(true);
  });

  it('rejects too short / too long', () => {
    expect(isValidNickname('ab')).toBe(false);
    expect(isValidNickname('a'.repeat(21))).toBe(false);
  });

  it('rejects non-strings', () => {
    const missing: unknown = void 0;
    expect(isValidNickname(42)).toBe(false);
    expect(isValidNickname(null)).toBe(false);
    expect(isValidNickname(missing)).toBe(false);
  });

  it('trims before checking length', () => {
    expect(isValidNickname('  ab  ')).toBe(false);
    expect(isValidNickname('  abc  ')).toBe(true);
  });
});

describe('isValidRoomCode', () => {
  it('accepts canonical codes', () => {
    expect(isValidRoomCode('ABCDEF')).toBe(true);
    expect(isValidRoomCode('23456H')).toBe(true);
  });

  it('rejects ambiguous characters', () => {
    expect(isValidRoomCode('ABCDE0')).toBe(false);
    expect(isValidRoomCode('ABCDE1')).toBe(false);
    expect(isValidRoomCode('ABCDEO')).toBe(false);
    expect(isValidRoomCode('ABCDEI')).toBe(false);
    expect(isValidRoomCode('ABCDEL')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('ABCDEFG')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('rejects lowercase', () => {
    expect(isValidRoomCode('abcdef')).toBe(false);
  });
});

describe('generateRoomCode', () => {
  it('generates a code of the right length using only allowed characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code.length).toBe(ROOM_CODE_LENGTH);
      for (const ch of code) {
        expect(ROOM_CODE_ALPHABET.includes(ch)).toBe(true);
      }
      expect(isValidRoomCode(code)).toBe(true);
    }
  });
});

describe('extractRoomCode', () => {
  it('accepts a bare code in any case, with padding', () => {
    expect(extractRoomCode('abcdef')).toBe('ABCDEF');
    expect(extractRoomCode('  ABCDEF \n')).toBe('ABCDEF');
  });

  it('pulls the code out of a pasted invite link', () => {
    expect(extractRoomCode('http://localhost:3000/room/ABCDEF')).toBe('ABCDEF');
    expect(extractRoomCode('https://example.com/room/abcdef/play')).toBe('ABCDEF');
  });

  it('rejects input without a usable code', () => {
    expect(extractRoomCode('')).toBeNull();
    expect(extractRoomCode('ABC')).toBeNull();
    expect(extractRoomCode('ABCDE0')).toBeNull();
    expect(extractRoomCode('https://example.com/room/')).toBeNull();
  });
});

describe('parseSlug', () => {
  it('strips Parsoid relative prefix', () => {
    expect(parseSlug('./Albert_Einstein')).toBe('Albert_Einstein');
  });

  it('strips /wiki/ prefix', () => {
    expect(parseSlug('/wiki/Albert_Einstein')).toBe('Albert_Einstein');
  });

  it('strips URL fragment', () => {
    expect(parseSlug('Albert_Einstein#Life')).toBe('Albert_Einstein');
  });

  it('strips query string', () => {
    expect(parseSlug('Albert_Einstein?foo=bar')).toBe('Albert_Einstein');
  });

  it('decodes percent encoding', () => {
    expect(parseSlug('Albert%20Einstein')).toBe('Albert_Einstein');
    expect(parseSlug('Praha_(řeka)')).toBe('Praha_(řeka)');
    expect(parseSlug('%C5%98ecko')).toBe('Řecko');
  });

  it('converts spaces to underscores', () => {
    expect(parseSlug('Albert Einstein')).toBe('Albert_Einstein');
  });

  it('leaves canonical slug untouched', () => {
    expect(parseSlug('Albert_Einstein')).toBe('Albert_Einstein');
  });
});

describe('slugsEqual', () => {
  it('matches different encodings of the same article', () => {
    expect(slugsEqual('./Albert_Einstein', 'Albert%20Einstein')).toBe(true);
    expect(slugsEqual('/wiki/Albert Einstein#Life', 'Albert_Einstein')).toBe(true);
  });

  it('returns false for different articles', () => {
    expect(slugsEqual('Albert_Einstein', 'Isaac_Newton')).toBe(false);
  });
});
