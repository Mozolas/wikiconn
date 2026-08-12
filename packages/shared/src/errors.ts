import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'GAME_ALREADY_STARTED',
  'GAME_NOT_RUNNING',
  'NOT_HOST',
  'NICKNAME_TAKEN',
  'INVALID_PAYLOAD',
  'WIKI_ARTICLE_NOT_FOUND',
  'WIKI_FETCH_FAILED',
  'INVALID_NAVIGATION',
  'IDENTITY_MISMATCH',
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorPayloadSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;
