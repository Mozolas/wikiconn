import { z } from 'zod';

import { ROOM_CODE_REGEX } from './constants.js';
import { languageSchema } from './language.js';
import { playerIdSchema, playerStateSchema, slugSchema } from './player.js';
import { visibilitySettingsSchema } from './visibility.js';

export const roomCodeSchema = z.string().regex(ROOM_CODE_REGEX);
export type RoomCode = z.infer<typeof roomCodeSchema>;

export const roomStatusSchema = z.enum(['lobby', 'playing', 'finished']);
export type RoomStatus = z.infer<typeof roomStatusSchema>;

export const roomSettingsSchema = z.object({
  lang: languageSchema,
  startSlug: slugSchema.optional(),
  finishSlug: slugSchema.optional(),
  visibility: visibilitySettingsSchema,
});

export type RoomSettings = z.infer<typeof roomSettingsSchema>;

/**
 * A settings change. An omitted key leaves the field alone; `null` clears it.
 * The distinction cannot be carried by `undefined`, because JSON serialization
 * drops those keys before the patch ever reaches the server.
 */
export const roomSettingsPatchSchema = z.object({
  lang: languageSchema.optional(),
  startSlug: slugSchema.nullish(),
  finishSlug: slugSchema.nullish(),
  visibility: visibilitySettingsSchema.optional(),
});

export type RoomSettingsPatch = z.infer<typeof roomSettingsPatchSchema>;

export const roomStateSchema = z.object({
  code: roomCodeSchema,
  hostPlayerId: playerIdSchema,
  status: roomStatusSchema,
  settings: roomSettingsSchema,
  players: z.array(playerStateSchema),
  createdAt: z.number().int(),
  startedAt: z.number().int().optional(),
  finishedAt: z.number().int().optional(),
  winnerId: playerIdSchema.optional(),
});

export type RoomState = z.infer<typeof roomStateSchema>;
