import { Injectable, Logger } from '@nestjs/common';
import {
  generateRoomCode,
  type Language,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  type PlayerState,
  type RoomSettingsPatch,
  type RoomState,
} from '@wikiconn/shared';

import { WsAppError } from './room.errors.js';
import { RoomRepository } from './room.repository.js';

export interface CreateRoomResult {
  code: string;
  hostPlayerId: string;
}

interface JoinRoomInput {
  code: string;
  playerId: string;
  playerSecret: string;
  nickname: string;
}

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(private readonly repo: RoomRepository) {}

  async createRoom(hostPlayerId: string, lang: Language = 'en'): Promise<CreateRoomResult> {
    let attempts = 0;
    let code = generateRoomCode();
    while (!(await this.repo.create({ code, hostPlayerId, lang }))) {
      attempts += 1;
      if (attempts > 8) {
        throw new WsAppError('INTERNAL_ERROR', 'Failed to generate unique room code');
      }
      code = generateRoomCode();
    }
    this.logger.log(`Room ${code} created by ${hostPlayerId}`);
    return { code, hostPlayerId };
  }

  async loadState(code: string): Promise<RoomState> {
    const persisted = await this.repo.loadRoom(code);
    if (persisted === null) {
      throw new WsAppError('ROOM_NOT_FOUND', `Room ${code} does not exist`);
    }
    const players = await this.repo.listPlayers(code);
    return this.repo.buildRoomState(persisted, players);
  }

  async tryLoadState(code: string): Promise<RoomState | null> {
    const persisted = await this.repo.loadRoom(code);
    if (persisted === null) return null;
    const players = await this.repo.listPlayers(code);
    return this.repo.buildRoomState(persisted, players);
  }

  async joinRoom(input: JoinRoomInput): Promise<{ room: RoomState; joined: boolean }> {
    return this.repo.withLock(input.code, async () => {
      const persisted = await this.repo.loadRoom(input.code);
      if (persisted === null) {
        throw new WsAppError('ROOM_NOT_FOUND', `Room ${input.code} does not exist`);
      }

      // Identity gate: a playerId is bound to the secret used on first join (TOFU).
      const existingSecret = await this.repo.getPlayerSecret(input.code, input.playerId);
      if (existingSecret !== null && existingSecret !== input.playerSecret) {
        throw new WsAppError('IDENTITY_MISMATCH', 'Player identity does not match');
      }

      const existing = await this.repo.getPlayer(input.code, input.playerId);

      if (existing !== null) {
        // Reconnect / refresh. Keep nickname stable once the game is running.
        const nickname = persisted.status === 'lobby' ? input.nickname : existing.nickname;
        const allPlayers = await this.repo.listPlayers(input.code);
        const others = allPlayers.filter((p) => p.playerId !== input.playerId);
        if (others.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
          throw new WsAppError('NICKNAME_TAKEN', `Nickname '${nickname}' is already taken`);
        }
        if (existingSecret === null) {
          await this.repo.setPlayerSecret(input.code, input.playerId, input.playerSecret);
        }
        await this.repo.upsertPlayer(input.code, { ...existing, nickname, connected: true });
        return { room: await this.loadState(input.code), joined: false };
      }

      if (persisted.status !== 'lobby') {
        throw new WsAppError(
          'GAME_ALREADY_STARTED',
          `Room ${input.code} is not accepting new players`,
        );
      }

      const players = await this.repo.listPlayers(input.code);
      if (players.length >= MAX_PLAYERS) {
        throw new WsAppError('ROOM_FULL', `Room ${input.code} is full`);
      }
      if (players.some((p) => p.nickname.toLowerCase() === input.nickname.toLowerCase())) {
        throw new WsAppError('NICKNAME_TAKEN', `Nickname '${input.nickname}' is already taken`);
      }

      await this.repo.setPlayerSecret(input.code, input.playerId, input.playerSecret);
      const player: PlayerState = {
        playerId: input.playerId,
        nickname: input.nickname,
        joinedAt: Date.now(),
        clickCount: 0,
        path: [],
        connected: true,
      };
      await this.repo.upsertPlayer(input.code, player);

      return { room: await this.loadState(input.code), joined: true };
    });
  }

  async leaveRoom(
    code: string,
    playerId: string,
  ): Promise<{ deleted: boolean; newHostId?: string; room?: RoomState }> {
    return this.repo.withLock(code, async () => {
      const persisted = await this.repo.loadRoom(code);
      if (persisted === null) return { deleted: true };

      await this.repo.removePlayer(code, playerId);
      const remaining = await this.repo.listPlayers(code);

      if (remaining.length === 0) {
        await this.repo.deleteRoom(code);
        this.logger.log(`Room ${code} deleted (empty)`);
        return { deleted: true };
      }

      let newHostId: string | undefined;
      if (persisted.hostPlayerId === playerId) {
        const next = remaining.toSorted(
          (a, b) => a.joinedAt - b.joinedAt || a.playerId.localeCompare(b.playerId),
        )[0];
        if (next === undefined) {
          await this.repo.deleteRoom(code);
          return { deleted: true };
        }
        await this.repo.setHost(code, next.playerId);
        newHostId = next.playerId;
        this.logger.log(`Room ${code} host transferred to ${next.playerId}`);
      }

      // A game can't continue with fewer than the minimum players: fall back to lobby
      // so the room is never stuck "playing" forever.
      if (persisted.status === 'playing' && remaining.length < MIN_PLAYERS_TO_START) {
        await this.repo.clearGameState(code);
        await this.repo.setStatus(code, 'lobby');
        this.logger.log(`Room ${code} returned to lobby (not enough players to continue)`);
      }

      const state = await this.loadState(code);
      return { deleted: false, room: state, ...(newHostId === undefined ? {} : { newHostId }) };
    });
  }

  async setConnected(code: string, playerId: string, connected: boolean): Promise<void> {
    await this.repo.withLock(code, async () => {
      const player = await this.repo.getPlayer(code, playerId);
      if (player === null) return;
      await this.repo.upsertPlayer(code, { ...player, connected });
    });
  }

  async updateSettings(
    code: string,
    requesterId: string,
    patch: RoomSettingsPatch,
  ): Promise<RoomState> {
    return this.repo.withLock(code, async () => {
      const persisted = await this.repo.loadRoom(code);
      if (persisted === null) {
        throw new WsAppError('ROOM_NOT_FOUND', `Room ${code} does not exist`);
      }
      if (persisted.hostPlayerId !== requesterId) {
        throw new WsAppError('NOT_HOST', 'Only the host can update settings');
      }
      if (persisted.status !== 'lobby') {
        throw new WsAppError('GAME_ALREADY_STARTED', 'Settings are locked once the game starts');
      }

      await this.repo.updateSettings(code, this.withLanguageInvariant(patch, persisted.settings));
      return this.loadState(code);
    });
  }

  /**
   * Slugs belong to one Wikipedia edition, so carrying them across a language
   * switch would start a race on an article that may not exist there. Clients
   * clear them themselves; enforcing it here keeps the rule server-side too.
   */
  private withLanguageInvariant(
    patch: RoomSettingsPatch,
    current: { lang: Language },
  ): RoomSettingsPatch {
    if (patch.lang === undefined || patch.lang === current.lang) return patch;
    return {
      ...patch,
      startSlug: patch.startSlug ?? null,
      finishSlug: patch.finishSlug ?? null,
    };
  }

  canStartGame(state: RoomState): { ok: true } | { ok: false; reason: WsAppError } {
    if (state.players.length < MIN_PLAYERS_TO_START) {
      return {
        ok: false,
        reason: new WsAppError(
          'INVALID_PAYLOAD',
          `Need at least ${String(MIN_PLAYERS_TO_START)} players to start`,
        ),
      };
    }
    if (state.settings.startSlug === undefined || state.settings.finishSlug === undefined) {
      return {
        ok: false,
        reason: new WsAppError('INVALID_PAYLOAD', 'Start and finish articles must be set'),
      };
    }
    return { ok: true };
  }

  async assertHost(code: string, playerId: string): Promise<RoomState> {
    const state = await this.loadState(code);
    if (state.hostPlayerId !== playerId) {
      throw new WsAppError('NOT_HOST', 'Only the host can perform this action');
    }
    return state;
  }
}
