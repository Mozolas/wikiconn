import { z } from 'zod';

import { errorPayloadSchema } from './errors.js';
import { languageSchema } from './language.js';
import { finalPlayerStateSchema, nicknameSchema, playerIdSchema, slugSchema } from './player.js';
import { roomCodeSchema, roomSettingsPatchSchema, roomStateSchema } from './room.js';

export const SOCKET_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE_SETTINGS: 'room:update-settings',
  ROOM_START_GAME: 'room:start-game',
  PLAYER_NAVIGATE: 'player:navigate',
  GAME_RESET: 'game:reset',

  ROOM_STATE: 'room:state',
  ROOM_PLAYER_JOINED: 'room:player-joined',
  ROOM_PLAYER_LEFT: 'room:player-left',
  ROOM_SETTINGS_UPDATED: 'room:settings-updated',
  GAME_STARTED: 'game:started',
  GAME_PLAYER_MOVED: 'game:player-moved',
  GAME_WON: 'game:won',
  ERROR: 'error',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export const roomJoinPayloadSchema = z.object({
  code: roomCodeSchema,
  playerId: playerIdSchema,
  playerSecret: z.string().min(16).max(200),
  nickname: nicknameSchema,
});
export type RoomJoinPayload = z.infer<typeof roomJoinPayloadSchema>;

export const roomLeavePayloadSchema = z.object({
  code: roomCodeSchema,
  playerId: playerIdSchema,
});
export type RoomLeavePayload = z.infer<typeof roomLeavePayloadSchema>;

export const roomUpdateSettingsPayloadSchema = z.object({
  code: roomCodeSchema,
  settings: roomSettingsPatchSchema,
});
export type RoomUpdateSettingsPayload = z.infer<typeof roomUpdateSettingsPayloadSchema>;

export const roomStartGamePayloadSchema = z.object({
  code: roomCodeSchema,
});
export type RoomStartGamePayload = z.infer<typeof roomStartGamePayloadSchema>;

export const playerNavigatePayloadSchema = z.object({
  code: roomCodeSchema,
  playerId: playerIdSchema,
  fromSlug: slugSchema,
  toSlug: slugSchema,
});
export type PlayerNavigatePayload = z.infer<typeof playerNavigatePayloadSchema>;

export const gameResetPayloadSchema = z.object({
  code: roomCodeSchema,
});
export type GameResetPayload = z.infer<typeof gameResetPayloadSchema>;

export const roomStatePayloadSchema = z.object({
  room: roomStateSchema,
});
export type RoomStatePayload = z.infer<typeof roomStatePayloadSchema>;

export const roomPlayerJoinedPayloadSchema = z.object({
  playerId: playerIdSchema,
  nickname: nicknameSchema,
});
export type RoomPlayerJoinedPayload = z.infer<typeof roomPlayerJoinedPayloadSchema>;

export const roomPlayerLeftPayloadSchema = z.object({
  playerId: playerIdSchema,
});
export type RoomPlayerLeftPayload = z.infer<typeof roomPlayerLeftPayloadSchema>;

export const roomSettingsUpdatedPayloadSchema = z.object({
  settings: roomSettingsPatchSchema,
});
export type RoomSettingsUpdatedPayload = z.infer<typeof roomSettingsUpdatedPayloadSchema>;

export const gameStartedPayloadSchema = z.object({
  startSlug: slugSchema,
  finishSlug: slugSchema,
  lang: languageSchema,
  startedAt: z.number().int(),
});
export type GameStartedPayload = z.infer<typeof gameStartedPayloadSchema>;

export const gamePlayerMovedPayloadSchema = z.object({
  playerId: playerIdSchema,
  currentSlug: slugSchema.optional(),
  clickCount: z.number().int().nonnegative().optional(),
  path: z.array(slugSchema).optional(),
});
export type GamePlayerMovedPayload = z.infer<typeof gamePlayerMovedPayloadSchema>;

export const gameWonPayloadSchema = z.object({
  winnerId: playerIdSchema,
  finalStates: z.record(playerIdSchema, finalPlayerStateSchema),
  durationMs: z.number().int().nonnegative(),
});
export type GameWonPayload = z.infer<typeof gameWonPayloadSchema>;

export const errorEventPayloadSchema = errorPayloadSchema;
export type ErrorEventPayload = z.infer<typeof errorEventPayloadSchema>;

export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload) => void;
  'room:leave': (payload: RoomLeavePayload) => void;
  'room:update-settings': (payload: RoomUpdateSettingsPayload) => void;
  'room:start-game': (payload: RoomStartGamePayload) => void;
  'player:navigate': (payload: PlayerNavigatePayload) => void;
  'game:reset': (payload: GameResetPayload) => void;
}

export interface ServerToClientEvents {
  'room:state': (payload: RoomStatePayload) => void;
  'room:player-joined': (payload: RoomPlayerJoinedPayload) => void;
  'room:player-left': (payload: RoomPlayerLeftPayload) => void;
  'room:settings-updated': (payload: RoomSettingsUpdatedPayload) => void;
  'game:started': (payload: GameStartedPayload) => void;
  'game:player-moved': (payload: GamePlayerMovedPayload) => void;
  'game:won': (payload: GameWonPayload) => void;
  error: (payload: ErrorEventPayload) => void;
}
