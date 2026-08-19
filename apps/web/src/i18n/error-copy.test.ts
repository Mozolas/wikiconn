import { describe, expect, it } from 'vitest';

import { cs } from '@/i18n/dictionaries/cs';
import { en } from '@/i18n/dictionaries/en';
import { describeApiError, describeError } from '@/i18n/error-copy';
import { API_NETWORK_ERROR, API_TIMEOUT, ApiError } from '@/lib/api';

describe('describeApiError', () => {
  it('translates a request that never reached the server', () => {
    const error = new ApiError({
      statusCode: 0,
      message: 'Network error',
      code: API_NETWORK_ERROR,
    });
    expect(describeApiError(cs.errors, error, 'záloha')).toBe(cs.errors.network);
    expect(describeApiError(en.errors, error, 'fallback')).toBe(en.errors.network);
  });

  it('translates a timeout', () => {
    const error = new ApiError({ statusCode: 0, message: 'Request timed out', code: API_TIMEOUT });
    expect(describeApiError(cs.errors, error, 'záloha')).toBe(cs.errors.timeout);
  });

  it('prefers the dictionary over the English sentence the server sent', () => {
    const error = new ApiError({
      statusCode: 404,
      message: 'Room ABCDEF does not exist',
      code: 'ROOM_NOT_FOUND',
    });
    expect(describeApiError(cs.errors, error, 'záloha')).toBe(
      cs.errors.byCode.ROOM_NOT_FOUND?.message,
    );
  });

  it('falls back for codes it has no copy for, rather than leaking English', () => {
    // A code the player can do nothing about, so it has no copy on purpose.
    const untranslated = new ApiError({
      statusCode: 400,
      message: 'Validation failed',
      code: 'INVALID_PAYLOAD',
    });
    expect(describeApiError(cs.errors, untranslated, 'záloha')).toBe('záloha');

    const unknown = new ApiError({ statusCode: 418, message: 'I am a teapot' });
    expect(describeApiError(cs.errors, unknown, 'záloha')).toBe('záloha');
  });

  it('falls back for anything that is not an ApiError', () => {
    expect(describeApiError(cs.errors, new Error('boom'), 'záloha')).toBe('záloha');
    expect(describeApiError(cs.errors, 'boom', 'záloha')).toBe('záloha');
  });
});

describe('describeError', () => {
  it('translates the socket errors a player can act on', () => {
    const described = describeError(cs.errors, { code: 'ROOM_FULL', message: 'Room X is full' });
    expect(described.title).toBe(cs.errors.byCode.ROOM_FULL?.title);
    expect(described.message).toBe(cs.errors.byCode.ROOM_FULL?.message);
  });

  it('keeps the server sentence for codes meant for developers', () => {
    const described = describeError(cs.errors, {
      code: 'INVALID_PAYLOAD',
      message: 'Session/payload mismatch',
    });
    expect(described.title).toBe(cs.errors.cannotJoin);
    expect(described.message).toBe('Session/payload mismatch');
  });
});
