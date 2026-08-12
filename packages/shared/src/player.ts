import { z } from 'zod';

import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from './constants.js';

export const playerIdSchema = z.uuidv4();
export type PlayerId = z.infer<typeof playerIdSchema>;

export const nicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN_LENGTH)
  .max(NICKNAME_MAX_LENGTH)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, 'Nickname must not contain control characters');
export type Nickname = z.infer<typeof nicknameSchema>;

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^[^\p{Cc}]+$/u, 'Slug must not contain control characters');
export type Slug = z.infer<typeof slugSchema>;

export const playerStateSchema = z.object({
  playerId: playerIdSchema,
  nickname: nicknameSchema,
  joinedAt: z.number().int(),
  currentSlug: slugSchema.optional(),
  clickCount: z.number().int().nonnegative(),
  path: z.array(slugSchema),
  finishedAt: z.number().int().optional(),
  connected: z.boolean(),
});

export type PlayerState = z.infer<typeof playerStateSchema>;

export const finalPlayerStateSchema = z.object({
  playerId: playerIdSchema,
  nickname: nicknameSchema,
  clickCount: z.number().int().nonnegative(),
  path: z.array(slugSchema),
  finishedAt: z.number().int().optional(),
  durationMs: z.number().int().optional(),
});

export type FinalPlayerState = z.infer<typeof finalPlayerStateSchema>;
