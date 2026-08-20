import {
  DEFAULT_VISIBILITY_SETTINGS,
  type Language,
  type PlayerState,
  type RoomSettingsPatch,
  type RoomState,
  type RoomStatus,
} from '@wikiconn/shared';
import { describe, expect, it } from 'vitest';

import { WsAppError } from '../room/room.errors.js';
import { RoomService } from '../room/room.service.js';

import { GameService } from './game.service.js';

import type { PersistedRoom } from '../room/room.repository.js';

class FakeRoomRepository {
  rooms = new Map<string, PersistedRoom>();
  players = new Map<string, Map<string, PlayerState>>();
  secrets = new Map<string, Map<string, string>>();

  withLock<T>(_code: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  exists(code: string): Promise<boolean> {
    return Promise.resolve(this.rooms.has(code));
  }

  create(input: { code: string; hostPlayerId: string; lang: Language }): Promise<boolean> {
    if (this.rooms.has(input.code)) return Promise.resolve(false);
    this.rooms.set(input.code, {
      code: input.code,
      hostPlayerId: input.hostPlayerId,
      status: 'lobby',
      settings: { lang: input.lang, visibility: DEFAULT_VISIBILITY_SETTINGS },
      createdAt: Date.now(),
    });
    this.players.set(input.code, new Map());
    return Promise.resolve(true);
  }

  loadRoom(code: string): Promise<PersistedRoom | null> {
    return Promise.resolve(this.rooms.get(code) ?? null);
  }

  setHost(code: string, hostPlayerId: string): Promise<void> {
    const room = this.rooms.get(code);
    if (room !== undefined) this.rooms.set(code, { ...room, hostPlayerId });
    return Promise.resolve();
  }

  setStatus(code: string, status: RoomStatus): Promise<void> {
    const room = this.rooms.get(code);
    if (room !== undefined) this.rooms.set(code, { ...room, status });
    return Promise.resolve();
  }

  setStartedAt(code: string, startedAt: number): Promise<void> {
    const room = this.rooms.get(code);
    if (room !== undefined) this.rooms.set(code, { ...room, startedAt });
    return Promise.resolve();
  }

  setFinishedAt(code: string, finishedAt: number, winnerId: string): Promise<void> {
    const room = this.rooms.get(code);
    if (room !== undefined) this.rooms.set(code, { ...room, finishedAt, winnerId });
    return Promise.resolve();
  }

  clearGameState(code: string): Promise<void> {
    const room = this.rooms.get(code);
    if (room === undefined) return Promise.resolve();
    this.rooms.set(code, {
      code: room.code,
      hostPlayerId: room.hostPlayerId,
      status: room.status,
      settings: room.settings,
      createdAt: room.createdAt,
    });
    return Promise.resolve();
  }

  updateSettings(code: string, patch: RoomSettingsPatch): Promise<void> {
    const room = this.rooms.get(code);
    if (room === undefined) return Promise.resolve();
    const settings: PersistedRoom['settings'] = {
      lang: patch.lang ?? room.settings.lang,
      visibility: patch.visibility ?? room.settings.visibility,
    };
    const start = patch.startSlug ?? room.settings.startSlug;
    if (start !== undefined) settings.startSlug = start;
    const finish = patch.finishSlug ?? room.settings.finishSlug;
    if (finish !== undefined) settings.finishSlug = finish;
    this.rooms.set(code, { ...room, settings });
    return Promise.resolve();
  }

  upsertPlayer(code: string, player: PlayerState): Promise<void> {
    let bucket = this.players.get(code);
    if (bucket === undefined) {
      bucket = new Map();
      this.players.set(code, bucket);
    }
    bucket.set(player.playerId, player);
    return Promise.resolve();
  }

  getPlayer(code: string, playerId: string): Promise<PlayerState | null> {
    return Promise.resolve(this.players.get(code)?.get(playerId) ?? null);
  }

  listPlayers(code: string): Promise<PlayerState[]> {
    return Promise.resolve([...(this.players.get(code)?.values() ?? [])]);
  }

  removePlayer(code: string, playerId: string): Promise<void> {
    this.players.get(code)?.delete(playerId);
    this.secrets.get(code)?.delete(playerId);
    return Promise.resolve();
  }

  getPlayerSecret(code: string, playerId: string): Promise<string | null> {
    return Promise.resolve(this.secrets.get(code)?.get(playerId) ?? null);
  }

  setPlayerSecret(code: string, playerId: string, secret: string): Promise<void> {
    let bucket = this.secrets.get(code);
    if (bucket === undefined) {
      bucket = new Map();
      this.secrets.set(code, bucket);
    }
    bucket.set(playerId, secret);
    return Promise.resolve();
  }

  deleteRoom(code: string): Promise<void> {
    this.rooms.delete(code);
    this.players.delete(code);
    this.secrets.delete(code);
    return Promise.resolve();
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

const hostId = '550e8400-e29b-41d4-a716-446655440000';
const guestId = '550e8400-e29b-41d4-a716-446655440001';
const SECRET = 'unit-test-secret-value';

async function makeReadyRoom(): Promise<{
  repo: FakeRoomRepository;
  rooms: RoomService;
  game: GameService;
  code: string;
}> {
  const repo = new FakeRoomRepository();
  const rooms = new RoomService(repo as unknown as ConstructorParameters<typeof RoomService>[0]);
  const game = new GameService(
    rooms,
    repo as unknown as ConstructorParameters<typeof GameService>[1],
  );

  const { code } = await rooms.createRoom(hostId, 'en');
  await rooms.joinRoom({ code, playerId: hostId, playerSecret: SECRET, nickname: 'host' });
  await rooms.joinRoom({ code, playerId: guestId, playerSecret: SECRET, nickname: 'guest' });
  await rooms.updateSettings(code, hostId, {
    startSlug: 'Albert_Einstein',
    finishSlug: 'Isaac_Newton',
  });

  return { repo, rooms, game, code };
}

describe('GameService.startGame', () => {
  it('requires the requester to be host', async () => {
    const { game, code } = await makeReadyRoom();
    await expect(game.startGame(code, guestId)).rejects.toMatchObject({ code: 'NOT_HOST' });
  });

  it('flips status to playing and seeds players with the start slug', async () => {
    const { game, rooms, code } = await makeReadyRoom();
    const result = await game.startGame(code, hostId);
    expect(result.payload.startSlug).toBe('Albert_Einstein');
    expect(result.payload.finishSlug).toBe('Isaac_Newton');

    const state = await rooms.loadState(code);
    expect(state.status).toBe('playing');
    for (const p of state.players) {
      expect(p.currentSlug).toBe('Albert_Einstein');
      expect(p.path).toEqual(['Albert_Einstein']);
      expect(p.clickCount).toBe(0);
    }
  });

  it('refuses to start without start/finish set', async () => {
    const repo = new FakeRoomRepository();
    const rooms = new RoomService(repo as unknown as ConstructorParameters<typeof RoomService>[0]);
    const game = new GameService(
      rooms,
      repo as unknown as ConstructorParameters<typeof GameService>[1],
    );
    const { code } = await rooms.createRoom(hostId);
    await rooms.joinRoom({ code, playerId: hostId, playerSecret: SECRET, nickname: 'host' });
    await rooms.joinRoom({ code, playerId: guestId, playerSecret: SECRET, nickname: 'guest' });
    await expect(game.startGame(code, hostId)).rejects.toBeInstanceOf(WsAppError);
  });

  it('refuses to start when start and finish are the same article', async () => {
    const { game, rooms, code } = await makeReadyRoom();
    await rooms.updateSettings(code, hostId, { finishSlug: 'Albert_Einstein' });
    await expect(game.startGame(code, hostId)).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });
  });
});

describe('GameService.navigate', () => {
  it('rejects navigation when game is not playing', async () => {
    const { game, code } = await makeReadyRoom();
    await expect(
      game.navigate(code, hostId, 'Albert_Einstein', 'Isaac_Newton'),
    ).rejects.toMatchObject({ code: 'GAME_NOT_RUNNING' });
  });

  it('rejects when fromSlug does not match player current slug', async () => {
    const { game, code } = await makeReadyRoom();
    await game.startGame(code, hostId);
    await expect(game.navigate(code, hostId, 'Cat', 'Isaac_Newton')).rejects.toMatchObject({
      code: 'INVALID_NAVIGATION',
    });
  });

  it('increments click count and updates path on a valid navigate', async () => {
    const { game, rooms, code } = await makeReadyRoom();
    await game.startGame(code, hostId);
    const result = await game.navigate(code, hostId, 'Albert_Einstein', 'Physics');
    expect(result.payload.clickCount).toBe(1);
    expect(result.payload.currentSlug).toBe('Physics');
    const state = await rooms.loadState(code);
    const host = state.players.find((p) => p.playerId === hostId);
    expect(host?.path).toEqual(['Albert_Einstein', 'Physics']);
    expect(host?.clickCount).toBe(1);
  });

  it('honours visibility filtering on the broadcast payload', async () => {
    const { game, rooms, code } = await makeReadyRoom();
    await rooms.updateSettings(code, hostId, {
      visibility: { showCurrentArticle: false, showClickCount: true, showFullPath: false },
    });
    await game.startGame(code, hostId);
    const result = await game.navigate(code, hostId, 'Albert_Einstein', 'Physics');
    expect(result.payload.currentSlug).toBeUndefined();
    expect(result.payload.clickCount).toBe(1);
    expect(result.payload.path).toBeUndefined();
  });

  it('emits game:won when a player reaches the finish article', async () => {
    const { game, code } = await makeReadyRoom();
    await game.startGame(code, hostId);
    const result = await game.navigate(code, hostId, 'Albert_Einstein', 'Isaac_Newton');
    expect(result.won).toBeDefined();
    expect(result.won?.winnerId).toBe(hostId);
    expect(result.won?.durationMs).toBeGreaterThanOrEqual(0);
    expect(Object.keys(result.won?.finalStates ?? {})).toContain(hostId);
    expect(Object.keys(result.won?.finalStates ?? {})).toContain(guestId);
  });

  it('always includes full paths in game:won regardless of visibility', async () => {
    const { game, rooms, code } = await makeReadyRoom();
    await rooms.updateSettings(code, hostId, {
      visibility: { showCurrentArticle: false, showClickCount: false, showFullPath: false },
    });
    await game.startGame(code, hostId);

    await game.navigate(code, guestId, 'Albert_Einstein', 'Mathematics');
    await game.navigate(code, hostId, 'Albert_Einstein', 'Physics');
    const result = await game.navigate(code, hostId, 'Physics', 'Isaac_Newton');

    expect(result.won).toBeDefined();
    const finals = result.won?.finalStates;
    expect(finals?.[hostId]?.path).toEqual(['Albert_Einstein', 'Physics', 'Isaac_Newton']);
    expect(finals?.[guestId]?.path).toEqual(['Albert_Einstein', 'Mathematics']);
  });

  it('declares only one winner when both players reach the finish', async () => {
    const { game, code } = await makeReadyRoom();
    await game.startGame(code, hostId);
    const r1 = await game.navigate(code, hostId, 'Albert_Einstein', 'Isaac_Newton');
    expect(r1.won?.winnerId).toBe(hostId);

    // Once the game is finished, a second finisher is rejected — no second game:won.
    await expect(
      game.navigate(code, guestId, 'Albert_Einstein', 'Isaac_Newton'),
    ).rejects.toMatchObject({ code: 'GAME_NOT_RUNNING' });
  });
});

describe('GameService.resetGame', () => {
  it('returns room to lobby and clears player paths', async () => {
    const { game, rooms, code } = await makeReadyRoom();
    await game.startGame(code, hostId);
    await game.navigate(code, hostId, 'Albert_Einstein', 'Physics');

    await game.resetGame(code, hostId);
    const state = await rooms.loadState(code);
    expect(state.status).toBe('lobby');
    for (const p of state.players) {
      expect(p.clickCount).toBe(0);
      expect(p.path).toEqual([]);
      expect(p.finishedAt).toBeUndefined();
    }
  });

  it('rejects reset from non-host', async () => {
    const { game, code } = await makeReadyRoom();
    await game.startGame(code, hostId);
    await expect(game.resetGame(code, guestId)).rejects.toMatchObject({ code: 'NOT_HOST' });
  });
});
