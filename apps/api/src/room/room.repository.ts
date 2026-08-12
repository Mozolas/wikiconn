import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_VISIBILITY_SETTINGS,
  type Language,
  languageSchema,
  type PlayerState,
  playerStateSchema,
  ROOM_TTL_SECONDS,
  type RoomSettingsPatch,
  type RoomState,
  type RoomStatus,
  roomStatusSchema,
  type VisibilitySettings,
  visibilitySettingsSchema,
} from '@wikiconn/shared';

import { RedisService } from '../redis/redis.service.js';

import { WsAppError } from './room.errors.js';
import { lockKey, playersKey, ROOM_HASH_FIELDS, roomKey, secretsKey } from './room.keys.js';

interface CreateRoomInput {
  code: string;
  hostPlayerId: string;
  lang: Language;
}

interface PersistedSettings {
  lang: Language;
  startSlug?: string;
  finishSlug?: string;
  visibility: VisibilitySettings;
}

export interface PersistedRoom {
  code: string;
  hostPlayerId: string;
  status: RoomStatus;
  settings: PersistedSettings;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  winnerId?: string;
}

const LOCK_TTL_MS = 5000;
const LOCK_MAX_ATTEMPTS = 100;
const LOCK_RETRY_MS = 30;
// Release the lock only if we still own it (compare-and-delete), avoiding
// deleting a lock that has already expired and been taken by someone else.
const LOCK_RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function parsePlayer(raw: string): PlayerState | null {
  try {
    return playerStateSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

@Injectable()
export class RoomRepository {
  private readonly logger = new Logger(RoomRepository.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Run `fn` while holding an exclusive per-room lock so that read-modify-write
   * sequences against the room state are serialized (no lost updates / split brain).
   */
  async withLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const key = lockKey(code);
    const token = randomUUID();
    let acquired = false;
    for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt += 1) {
      const res = await this.redis.raw.set(key, token, 'PX', LOCK_TTL_MS, 'NX');
      if (res === 'OK') {
        acquired = true;
        break;
      }
      await delay(LOCK_RETRY_MS);
    }
    if (!acquired) {
      throw new WsAppError('INTERNAL_ERROR', 'Room is busy, please retry');
    }
    try {
      return await fn();
    } finally {
      try {
        await this.redis.raw.eval(LOCK_RELEASE_SCRIPT, 1, key, token);
      } catch {
        // The lock will expire on its own via PX; nothing actionable here.
      }
    }
  }

  async exists(code: string): Promise<boolean> {
    return (await this.redis.raw.exists(roomKey(code))) === 1;
  }

  /** Atomically create the room hash. Returns false if the code is already taken. */
  async create(input: CreateRoomInput): Promise<boolean> {
    const now = Date.now();
    const created = await this.redis.raw.hsetnx(
      roomKey(input.code),
      ROOM_HASH_FIELDS.createdAt,
      String(now),
    );
    if (created === 0) return false;

    await this.redis.raw.hset(roomKey(input.code), {
      [ROOM_HASH_FIELDS.hostPlayerId]: input.hostPlayerId,
      [ROOM_HASH_FIELDS.lang]: input.lang,
      [ROOM_HASH_FIELDS.visibility]: JSON.stringify(DEFAULT_VISIBILITY_SETTINGS),
      [ROOM_HASH_FIELDS.status]: 'lobby',
    });
    await this.touch(input.code);
    return true;
  }

  async loadRoom(code: string): Promise<PersistedRoom | null> {
    const raw = await this.redis.raw.hgetall(roomKey(code));
    if (Object.keys(raw).length === 0) return null;

    const hostPlayerId = raw[ROOM_HASH_FIELDS.hostPlayerId];
    const createdAt = Number(raw[ROOM_HASH_FIELDS.createdAt]);
    const langParsed = languageSchema.safeParse(raw[ROOM_HASH_FIELDS.lang]);
    const statusParsed = roomStatusSchema.safeParse(raw[ROOM_HASH_FIELDS.status]);

    if (
      hostPlayerId === undefined ||
      !Number.isFinite(createdAt) ||
      !langParsed.success ||
      !statusParsed.success
    ) {
      this.logger.warn(`Discarding corrupt room hash for ${code}`);
      return null;
    }

    let visibility: VisibilitySettings = DEFAULT_VISIBILITY_SETTINGS;
    const visibilityRaw = raw[ROOM_HASH_FIELDS.visibility];
    if (visibilityRaw !== undefined && visibilityRaw !== '') {
      const parsed = (() => {
        try {
          return visibilitySettingsSchema.parse(JSON.parse(visibilityRaw));
        } catch {
          return DEFAULT_VISIBILITY_SETTINGS;
        }
      })();
      visibility = parsed;
    }

    const settings: PersistedSettings = { lang: langParsed.data, visibility };
    const startSlug = raw[ROOM_HASH_FIELDS.startSlug];
    if (startSlug !== undefined && startSlug !== '') settings.startSlug = startSlug;
    const finishSlug = raw[ROOM_HASH_FIELDS.finishSlug];
    if (finishSlug !== undefined && finishSlug !== '') settings.finishSlug = finishSlug;

    const room: PersistedRoom = {
      code,
      hostPlayerId,
      status: statusParsed.data,
      settings,
      createdAt,
    };

    const startedAt = Number(raw[ROOM_HASH_FIELDS.startedAt]);
    if (Number.isFinite(startedAt) && raw[ROOM_HASH_FIELDS.startedAt] !== '') {
      room.startedAt = startedAt;
    }
    const finishedAt = Number(raw[ROOM_HASH_FIELDS.finishedAt]);
    if (Number.isFinite(finishedAt) && raw[ROOM_HASH_FIELDS.finishedAt] !== '') {
      room.finishedAt = finishedAt;
    }
    const winnerId = raw[ROOM_HASH_FIELDS.winnerId];
    if (winnerId !== undefined && winnerId !== '') room.winnerId = winnerId;

    return room;
  }

  async setHost(code: string, hostPlayerId: string): Promise<void> {
    await this.redis.raw.hset(roomKey(code), ROOM_HASH_FIELDS.hostPlayerId, hostPlayerId);
    await this.touch(code);
  }

  async setStatus(code: string, status: RoomStatus): Promise<void> {
    await this.redis.raw.hset(roomKey(code), ROOM_HASH_FIELDS.status, status);
    await this.touch(code);
  }

  async setStartedAt(code: string, startedAt: number): Promise<void> {
    await this.redis.raw.hset(roomKey(code), ROOM_HASH_FIELDS.startedAt, String(startedAt));
    await this.touch(code);
  }

  async setFinishedAt(code: string, finishedAt: number, winnerId: string): Promise<void> {
    await this.redis.raw.hset(roomKey(code), {
      [ROOM_HASH_FIELDS.finishedAt]: String(finishedAt),
      [ROOM_HASH_FIELDS.winnerId]: winnerId,
    });
    await this.touch(code);
  }

  async clearGameState(code: string): Promise<void> {
    await this.redis.raw.hdel(
      roomKey(code),
      ROOM_HASH_FIELDS.startedAt,
      ROOM_HASH_FIELDS.finishedAt,
      ROOM_HASH_FIELDS.winnerId,
    );
    await this.touch(code);
  }

  /** `null` in the patch clears a field; an omitted key leaves it untouched. */
  async updateSettings(code: string, patch: RoomSettingsPatch): Promise<void> {
    const fields: Record<string, string> = {};
    const cleared: string[] = [];

    if (patch.lang !== undefined) fields[ROOM_HASH_FIELDS.lang] = patch.lang;
    if (patch.startSlug === null) cleared.push(ROOM_HASH_FIELDS.startSlug);
    else if (patch.startSlug !== undefined) fields[ROOM_HASH_FIELDS.startSlug] = patch.startSlug;
    if (patch.finishSlug === null) cleared.push(ROOM_HASH_FIELDS.finishSlug);
    else if (patch.finishSlug !== undefined) fields[ROOM_HASH_FIELDS.finishSlug] = patch.finishSlug;
    if (patch.visibility !== undefined) {
      fields[ROOM_HASH_FIELDS.visibility] = JSON.stringify(patch.visibility);
    }

    const hasWrites = Object.keys(fields).length > 0;
    if (!hasWrites && cleared.length === 0) return;

    const tx = this.redis.raw.multi();
    if (hasWrites) tx.hset(roomKey(code), fields);
    if (cleared.length > 0) tx.hdel(roomKey(code), ...cleared);
    await tx.exec();
    await this.touch(code);
  }

  async upsertPlayer(code: string, player: PlayerState): Promise<void> {
    await this.redis.raw.hset(playersKey(code), player.playerId, JSON.stringify(player));
    await this.touch(code);
  }

  async getPlayer(code: string, playerId: string): Promise<PlayerState | null> {
    const raw = await this.redis.raw.hget(playersKey(code), playerId);
    if (raw === null) return null;
    const parsed = parsePlayer(raw);
    if (parsed === null) this.logger.warn(`Discarding corrupt player ${playerId} in ${code}`);
    return parsed;
  }

  async listPlayers(code: string): Promise<PlayerState[]> {
    const raw = await this.redis.raw.hgetall(playersKey(code));
    const players: PlayerState[] = [];
    for (const value of Object.values(raw)) {
      const parsed = parsePlayer(value);
      if (parsed === null) {
        this.logger.warn(`Discarding corrupt player record in ${code}`);
      } else {
        players.push(parsed);
      }
    }
    return players;
  }

  async removePlayer(code: string, playerId: string): Promise<void> {
    await this.redis.raw.hdel(playersKey(code), playerId);
    await this.redis.raw.hdel(secretsKey(code), playerId);
    await this.touch(code);
  }

  async getPlayerSecret(code: string, playerId: string): Promise<string | null> {
    return this.redis.raw.hget(secretsKey(code), playerId);
  }

  async setPlayerSecret(code: string, playerId: string, secret: string): Promise<void> {
    await this.redis.raw.hset(secretsKey(code), playerId, secret);
    await this.touch(code);
  }

  async deleteRoom(code: string): Promise<void> {
    await this.redis.raw.del(roomKey(code), playersKey(code), secretsKey(code));
  }

  async touch(code: string): Promise<void> {
    await Promise.all([
      this.redis.raw.expire(roomKey(code), ROOM_TTL_SECONDS),
      this.redis.raw.expire(playersKey(code), ROOM_TTL_SECONDS),
      this.redis.raw.expire(secretsKey(code), ROOM_TTL_SECONDS),
    ]);
  }

  buildRoomState(persisted: PersistedRoom, players: PlayerState[]): RoomState {
    const sorted = players.toSorted(
      (a, b) => a.joinedAt - b.joinedAt || a.playerId.localeCompare(b.playerId),
    );
    const state: RoomState = {
      code: persisted.code,
      hostPlayerId: persisted.hostPlayerId,
      status: persisted.status,
      settings: persisted.settings,
      players: sorted,
      createdAt: persisted.createdAt,
    };
    if (persisted.startedAt !== undefined) state.startedAt = persisted.startedAt;
    if (persisted.finishedAt !== undefined) state.finishedAt = persisted.finishedAt;
    if (persisted.winnerId !== undefined) state.winnerId = persisted.winnerId;
    return state;
  }
}
