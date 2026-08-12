import {
  DEFAULT_VISIBILITY_SETTINGS,
  type Language,
  MAX_PLAYERS,
  type PlayerState,
  type RoomSettingsPatch,
  type RoomState,
  type RoomStatus,
} from '@wikiconn/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import { WsAppError } from './room.errors.js';
import { RoomService } from './room.service.js';

import type { PersistedRoom } from './room.repository.js';

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
    // Mirrors the real repository: null clears, an absent key keeps.
    const start = patch.startSlug === undefined ? room.settings.startSlug : patch.startSlug;
    if (start !== undefined && start !== null) settings.startSlug = start;
    const finish = patch.finishSlug === undefined ? room.settings.finishSlug : patch.finishSlug;
    if (finish !== undefined && finish !== null) settings.finishSlug = finish;
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
    return {
      code: persisted.code,
      hostPlayerId: persisted.hostPlayerId,
      status: persisted.status,
      settings: persisted.settings,
      players: sorted,
      createdAt: persisted.createdAt,
    };
  }
}

const hostId = '550e8400-e29b-41d4-a716-446655440000';
const guestId = '550e8400-e29b-41d4-a716-446655440001';
const guest2Id = '550e8400-e29b-41d4-a716-446655440002';
const SECRET = 'unit-test-secret-value';

describe('RoomService', () => {
  let repo: FakeRoomRepository;
  let service: RoomService;

  beforeEach(() => {
    repo = new FakeRoomRepository();
    service = new RoomService(repo as unknown as ConstructorParameters<typeof RoomService>[0]);
  });

  const join = (code: string, playerId: string, nickname: string, secret = SECRET) =>
    service.joinRoom({ code, playerId, playerSecret: secret, nickname });

  it('creates a room with a unique code', async () => {
    const result = await service.createRoom(hostId, 'cs');
    expect(result.hostPlayerId).toBe(hostId);
    expect(result.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await repo.exists(result.code)).toBe(true);
  });

  it('rejects join when room does not exist', async () => {
    await expect(join('ABCDEF', guestId, 'guest')).rejects.toMatchObject({
      code: 'ROOM_NOT_FOUND',
    });
  });

  it('adds players up to MAX_PLAYERS', async () => {
    const { code } = await service.createRoom(hostId);
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const playerId = `550e8400-e29b-41d4-a716-44665544000${String(i)}`;
      const id = i === 0 ? hostId : playerId;
      await join(code, id, `p${String(i)}`);
    }
    const state = await service.loadState(code);
    expect(state.players).toHaveLength(MAX_PLAYERS);
  });

  it('rejects a 6th player', async () => {
    const { code } = await service.createRoom(hostId);
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const id = `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`;
      await join(code, id, `p${String(i)}`);
    }
    await expect(join(code, '550e8400-e29b-41d4-a716-aaaaaaaaaaaa', 'p6')).rejects.toMatchObject({
      code: 'ROOM_FULL',
    });
  });

  it('rejects duplicate nickname (case-insensitive)', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'Alice');
    await expect(join(code, guestId, 'alice')).rejects.toMatchObject({ code: 'NICKNAME_TAKEN' });
  });

  it('refreshes nickname on rejoin with same playerId without bumping count', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'Old');
    const second = await join(code, hostId, 'New');
    expect(second.joined).toBe(false);
    expect(second.room.players).toHaveLength(1);
    expect(second.room.players[0]?.nickname).toBe('New');
  });

  it('rejects rejoin with a mismatched secret (identity protection)', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');
    await expect(join(code, hostId, 'host', 'a-different-secret-value')).rejects.toMatchObject({
      code: 'IDENTITY_MISMATCH',
    });
  });

  it('transfers host on host leave to the earliest joiner (deterministic tie-break)', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');
    await join(code, guestId, 'guest1');
    await join(code, guest2Id, 'guest2');

    const result = await service.leaveRoom(code, hostId);
    expect(result.deleted).toBe(false);
    expect(result.newHostId).toBe(guestId);
    expect(result.room?.hostPlayerId).toBe(guestId);
  });

  it('deletes room when last player leaves', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'only');
    const result = await service.leaveRoom(code, hostId);
    expect(result.deleted).toBe(true);
    expect(await repo.exists(code)).toBe(false);
  });

  it('returns a stuck game to lobby when too few players remain', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');
    await join(code, guestId, 'guest');
    await repo.setStatus(code, 'playing');

    const result = await service.leaveRoom(code, guestId);
    expect(result.deleted).toBe(false);
    expect(result.room?.status).toBe('lobby');
  });

  it('only host can update settings', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');
    await join(code, guestId, 'guest');
    await expect(service.updateSettings(code, guestId, { startSlug: 'Foo' })).rejects.toMatchObject(
      { code: 'NOT_HOST' },
    );

    const updated = await service.updateSettings(code, hostId, {
      startSlug: 'Albert_Einstein',
      finishSlug: 'Isaac_Newton',
    });
    expect(updated.settings.startSlug).toBe('Albert_Einstein');
    expect(updated.settings.finishSlug).toBe('Isaac_Newton');
  });

  it('clears a slug when the patch carries null', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');

    await service.updateSettings(code, hostId, {
      startSlug: 'Albert_Einstein',
      finishSlug: 'Isaac_Newton',
    });

    const cleared = await service.updateSettings(code, hostId, { startSlug: null });
    expect(cleared.settings.startSlug).toBeUndefined();
    expect(cleared.settings.finishSlug).toBe('Isaac_Newton');
  });

  it('leaves a slug alone when the patch omits it', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');

    await service.updateSettings(code, hostId, { startSlug: 'Albert_Einstein' });
    const untouched = await service.updateSettings(code, hostId, { finishSlug: 'Isaac_Newton' });
    expect(untouched.settings.startSlug).toBe('Albert_Einstein');
  });

  it('drops both slugs when the language changes, even if the patch does not say so', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');

    await service.updateSettings(code, hostId, {
      startSlug: 'Albert_Einstein',
      finishSlug: 'Isaac_Newton',
    });

    const switched = await service.updateSettings(code, hostId, { lang: 'cs' });
    expect(switched.settings.lang).toBe('cs');
    expect(switched.settings.startSlug).toBeUndefined();
    expect(switched.settings.finishSlug).toBeUndefined();
  });

  it('keeps slugs when the language patch does not actually change the language', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');

    await service.updateSettings(code, hostId, { startSlug: 'Albert_Einstein' });
    const same = await service.updateSettings(code, hostId, { lang: 'en' });
    expect(same.settings.startSlug).toBe('Albert_Einstein');
  });

  it('canStartGame requires at least 2 players and both slugs', async () => {
    const { code } = await service.createRoom(hostId);
    await join(code, hostId, 'host');

    const oneState = await service.loadState(code);
    const tooFew = service.canStartGame(oneState);
    expect(tooFew.ok).toBe(false);

    await join(code, guestId, 'guest');
    const noSlugs = await service.loadState(code);
    const noSlugsResult = service.canStartGame(noSlugs);
    expect(noSlugsResult.ok).toBe(false);
    if (!noSlugsResult.ok) {
      expect(noSlugsResult.reason).toBeInstanceOf(WsAppError);
    }

    await service.updateSettings(code, hostId, {
      startSlug: 'Albert_Einstein',
      finishSlug: 'Isaac_Newton',
    });
    const ready = await service.loadState(code);
    expect(service.canStartGame(ready).ok).toBe(true);
  });
});
