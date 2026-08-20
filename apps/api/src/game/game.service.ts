import { Injectable, Logger } from '@nestjs/common';
import {
  type FinalPlayerState,
  type GamePlayerMovedPayload,
  type GameStartedPayload,
  type GameWonPayload,
  type PlayerState,
  type RoomState,
  type VisibilitySettings,
  parseSlug,
  slugsEqual,
} from '@wikiconn/shared';

import { WsAppError } from '../room/room.errors.js';
import { RoomRepository } from '../room/room.repository.js';
import { RoomService } from '../room/room.service.js';

export interface MoveResult {
  state: RoomState;
  payload: GamePlayerMovedPayload;
  won?: GameWonPayload;
}

export interface StartResult {
  state: RoomState;
  payload: GameStartedPayload;
}

export interface ResetResult {
  state: RoomState;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly rooms: RoomService,
    private readonly repo: RoomRepository,
  ) {}

  async startGame(code: string, requesterId: string): Promise<StartResult> {
    return this.repo.withLock(code, async () => {
      const state = await this.rooms.assertHost(code, requesterId);

      if (state.status !== 'lobby') {
        throw new WsAppError('GAME_ALREADY_STARTED', 'Game is not in lobby state');
      }

      const check = this.rooms.canStartGame(state);
      if (!check.ok) throw check.reason;

      const { startSlug, finishSlug } = state.settings;
      if (startSlug === undefined || finishSlug === undefined) {
        throw new WsAppError('INVALID_PAYLOAD', 'Start and finish must be set');
      }

      const normalizedStart = parseSlug(startSlug);
      const normalizedFinish = parseSlug(finishSlug);
      if (normalizedStart.length === 0 || normalizedFinish.length === 0) {
        throw new WsAppError('INVALID_PAYLOAD', 'Start and finish articles must be valid');
      }
      if (slugsEqual(normalizedStart, normalizedFinish)) {
        throw new WsAppError('INVALID_PAYLOAD', 'Start and finish must be different');
      }

      const startedAt = Date.now();
      await this.repo.clearGameState(code);
      await this.repo.setStatus(code, 'playing');
      await this.repo.setStartedAt(code, startedAt);
      await this.repo.updateSettings(code, {
        startSlug: normalizedStart,
        finishSlug: normalizedFinish,
      });

      for (const p of state.players) {
        const updated: PlayerState = {
          playerId: p.playerId,
          nickname: p.nickname,
          joinedAt: p.joinedAt,
          currentSlug: normalizedStart,
          clickCount: 0,
          path: [normalizedStart],
          connected: p.connected,
        };
        await this.repo.upsertPlayer(code, updated);
      }

      const refreshed = await this.rooms.loadState(code);
      this.logger.log(`Game started in room ${code}: ${normalizedStart} → ${normalizedFinish}`);
      const payload: GameStartedPayload = {
        startSlug: normalizedStart,
        finishSlug: normalizedFinish,
        lang: refreshed.settings.lang,
        startedAt,
      };
      return { state: refreshed, payload };
    });
  }

  async navigate(
    code: string,
    playerId: string,
    fromSlugRaw: string,
    toSlugRaw: string,
  ): Promise<MoveResult> {
    const fromSlug = parseSlug(fromSlugRaw);
    const toSlug = parseSlug(toSlugRaw);

    return this.repo.withLock(code, async () => {
      const state = await this.rooms.loadState(code);
      if (state.status !== 'playing') {
        throw new WsAppError('GAME_NOT_RUNNING', 'Game is not running');
      }

      const player = state.players.find((p) => p.playerId === playerId);
      if (player === undefined) {
        throw new WsAppError('INVALID_PAYLOAD', 'Player is not in this room');
      }
      if (player.finishedAt !== undefined) {
        throw new WsAppError('GAME_NOT_RUNNING', 'Player has already finished');
      }
      if (player.currentSlug === undefined || !slugsEqual(player.currentSlug, fromSlug)) {
        throw new WsAppError(
          'INVALID_NAVIGATION',
          `Expected to navigate from ${String(player.currentSlug)} but got ${fromSlug}`,
        );
      }

      const newClickCount = player.clickCount + 1;
      const newPath = [...player.path, toSlug];
      const finishSlug = state.settings.finishSlug;
      const isFinishingMove = finishSlug !== undefined && slugsEqual(toSlug, finishSlug);
      const finishedAt = isFinishingMove ? Date.now() : undefined;

      const updatedPlayer: PlayerState = {
        ...player,
        currentSlug: toSlug,
        clickCount: newClickCount,
        path: newPath,
        connected: true,
      };
      if (finishedAt !== undefined) updatedPlayer.finishedAt = finishedAt;
      await this.repo.upsertPlayer(code, updatedPlayer);

      const movePayload = this.buildMovePayload(
        playerId,
        toSlug,
        newClickCount,
        newPath,
        state.settings.visibility,
      );

      if (finishedAt === undefined) {
        return { state: await this.rooms.loadState(code), payload: movePayload };
      }

      // The lock guarantees status was still 'playing' above, so this finishing
      // move is the first to complete — it is the single, authoritative winner.
      await this.repo.setStatus(code, 'finished');
      await this.repo.setFinishedAt(code, finishedAt, playerId);
      const finalState = await this.rooms.loadState(code);
      const startedAt = finalState.startedAt ?? finishedAt;
      const won = this.buildWonPayload(finalState, playerId, startedAt);
      this.logger.log(`Game won in ${code} by ${playerId}`);
      return { state: finalState, payload: movePayload, won };
    });
  }

  async resetGame(code: string, requesterId: string): Promise<ResetResult> {
    return this.repo.withLock(code, async () => {
      const state = await this.rooms.assertHost(code, requesterId);

      await this.repo.clearGameState(code);
      await this.repo.setStatus(code, 'lobby');

      for (const p of state.players) {
        const cleared: PlayerState = {
          playerId: p.playerId,
          nickname: p.nickname,
          joinedAt: p.joinedAt,
          clickCount: 0,
          path: [],
          connected: p.connected,
        };
        await this.repo.upsertPlayer(code, cleared);
      }

      const refreshed = await this.rooms.loadState(code);
      this.logger.log(`Game reset in room ${code}`);
      return { state: refreshed };
    });
  }

  buildMovePayload(
    playerId: string,
    currentSlug: string,
    clickCount: number,
    path: string[],
    visibility: VisibilitySettings,
  ): GamePlayerMovedPayload {
    const payload: GamePlayerMovedPayload = { playerId };
    if (visibility.showCurrentArticle) payload.currentSlug = currentSlug;
    if (visibility.showClickCount) payload.clickCount = clickCount;
    if (visibility.showFullPath) payload.path = [...path];
    return payload;
  }

  buildWonPayload(state: RoomState, winnerId: string, startedAt: number): GameWonPayload {
    const finalStates: Record<string, FinalPlayerState> = {};
    for (const p of state.players) {
      const fs: FinalPlayerState = {
        playerId: p.playerId,
        nickname: p.nickname,
        clickCount: p.clickCount,
        path: [...p.path],
      };
      if (p.finishedAt !== undefined) {
        fs.finishedAt = p.finishedAt;
        fs.durationMs = Math.max(0, p.finishedAt - startedAt);
      }
      finalStates[p.playerId] = fs;
    }
    const winner = state.players.find((p) => p.playerId === winnerId);
    const winnerFinishedAt = winner?.finishedAt ?? Date.now();
    return {
      winnerId,
      finalStates,
      durationMs: Math.max(0, winnerFinishedAt - startedAt),
    };
  }
}
