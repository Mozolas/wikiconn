import { describe, expect, it } from 'vitest';

import {
  errorPayloadSchema,
  gameWonPayloadSchema,
  playerNavigatePayloadSchema,
  roomJoinPayloadSchema,
  roomStateSchema,
  visibilitySettingsSchema,
} from './index.js';

const validPlayerId = '550e8400-e29b-41d4-a716-446655440000';
const validSecret = 'unit-test-secret-value';

describe('roomJoinPayloadSchema', () => {
  it('parses a valid payload', () => {
    expect(() =>
      roomJoinPayloadSchema.parse({
        code: 'ABCDEF',
        playerId: validPlayerId,
        playerSecret: validSecret,
        nickname: 'alice',
      }),
    ).not.toThrow();
  });

  it('rejects an invalid room code', () => {
    expect(
      roomJoinPayloadSchema.safeParse({
        code: 'abcdef',
        playerId: validPlayerId,
        playerSecret: validSecret,
        nickname: 'alice',
      }).success,
    ).toBe(false);
  });

  it('rejects a short nickname', () => {
    expect(
      roomJoinPayloadSchema.safeParse({
        code: 'ABCDEF',
        playerId: validPlayerId,
        playerSecret: validSecret,
        nickname: 'ab',
      }).success,
    ).toBe(false);
  });

  it('rejects a missing secret', () => {
    expect(
      roomJoinPayloadSchema.safeParse({
        code: 'ABCDEF',
        playerId: validPlayerId,
        nickname: 'alice',
      }).success,
    ).toBe(false);
  });
});

describe('playerNavigatePayloadSchema', () => {
  it('parses a valid payload', () => {
    const parsed = playerNavigatePayloadSchema.parse({
      code: 'ABCDEF',
      playerId: validPlayerId,
      fromSlug: 'Albert_Einstein',
      toSlug: 'Isaac_Newton',
    });
    expect(parsed.toSlug).toBe('Isaac_Newton');
  });
});

describe('visibilitySettingsSchema', () => {
  it('rejects incomplete settings (missing required keys)', () => {
    expect(visibilitySettingsSchema.safeParse({ showCurrentArticle: true }).success).toBe(false);
  });
});

describe('gameWonPayloadSchema', () => {
  it('accepts a typical payload', () => {
    const parsed = gameWonPayloadSchema.parse({
      winnerId: validPlayerId,
      finalStates: {
        [validPlayerId]: {
          playerId: validPlayerId,
          nickname: 'alice',
          clickCount: 5,
          path: ['Albert_Einstein', 'Isaac_Newton'],
          finishedAt: 1_700_000_000_000,
          durationMs: 12_345,
        },
      },
      durationMs: 12_345,
    });
    expect(parsed.winnerId).toBe(validPlayerId);
  });
});

describe('roomStateSchema', () => {
  it('round-trips a minimal lobby room', () => {
    const room = roomStateSchema.parse({
      code: 'ABCDEF',
      hostPlayerId: validPlayerId,
      status: 'lobby',
      settings: {
        lang: 'en',
        visibility: { showCurrentArticle: true, showClickCount: true, showFullPath: false },
      },
      players: [
        {
          playerId: validPlayerId,
          nickname: 'host',
          joinedAt: 1_700_000_000_000,
          clickCount: 0,
          path: [],
          connected: true,
        },
      ],
      createdAt: 1_700_000_000_000,
    });
    expect(room.players).toHaveLength(1);
  });
});

describe('errorPayloadSchema', () => {
  it('requires a known code', () => {
    expect(errorPayloadSchema.safeParse({ code: 'WHATEVER', message: 'x' }).success).toBe(false);
    expect(errorPayloadSchema.safeParse({ code: 'ROOM_NOT_FOUND', message: 'x' }).success).toBe(
      true,
    );
  });
});
