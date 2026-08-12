'use client';

import {
  type ErrorPayload,
  type GameStartedPayload,
  type GameWonPayload,
  type PlayerNavigatePayload,
  type RoomSettingsPatch,
  type RoomState,
  SOCKET_EVENTS,
} from '@wikiconn/shared';
import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import {
  getServerEventSchema,
  getSocket,
  type ServerEventName,
  type ServerEventPayload,
  type WikiSocket,
} from './socket';

interface RoomStore {
  room: RoomState | null;
  lastStartPayload: GameStartedPayload | null;
  lastWonPayload: GameWonPayload | null;
  lastError: ErrorPayload | null;
  connected: boolean;
}

const DEFAULT_STATE: RoomStore = {
  room: null,
  lastStartPayload: null,
  lastWonPayload: null,
  lastError: null,
  connected: false,
};

type Listener = () => void;

class RoomClient {
  private state: RoomStore = { ...DEFAULT_STATE };
  private readonly listeners = new Set<Listener>();
  private socket: WikiSocket | null = null;
  private refCount = 0;
  private readonly boundHandlers = new Map<ServerEventName, (raw: unknown) => void>();
  private onConnect: (() => void) | null = null;
  private onDisconnect: (() => void) | null = null;
  private onConnectError: (() => void) | null = null;

  attach(code: string, playerId: string, playerSecret: string, nickname: string): void {
    this.refCount += 1;
    // Listeners are bound once for the whole room session; extra mounts
    // (StrictMode, lobby↔play navigation) just bump the ref count.
    if (this.refCount > 1) return;

    this.state = { ...DEFAULT_STATE };
    this.notify();

    const socket = getSocket();
    this.socket = socket;

    const join = (): void => {
      socket.emit(SOCKET_EVENTS.ROOM_JOIN, { code, playerId, playerSecret, nickname });
    };

    this.onConnect = (): void => {
      this.update((s) => ({ ...s, connected: true }));
      join();
    };
    this.onDisconnect = (): void => {
      this.update((s) => ({ ...s, connected: false }));
    };
    this.onConnectError = (): void => {
      this.update((s) => ({ ...s, connected: false }));
    };

    this.bind(SOCKET_EVENTS.ROOM_STATE, ({ room }) => {
      this.update((s) => ({ ...s, room, lastError: null }));
    });
    this.bind(SOCKET_EVENTS.GAME_STARTED, (payload) => {
      this.update((s) => ({ ...s, lastStartPayload: payload, lastWonPayload: null }));
    });
    this.bind(SOCKET_EVENTS.GAME_WON, (payload) => {
      this.update((s) => ({ ...s, lastWonPayload: payload }));
    });
    this.bind(SOCKET_EVENTS.ERROR, (payload) => {
      this.update((s) => ({ ...s, lastError: payload }));
      toast.error(payload.message);
    });

    socket.on('connect', this.onConnect);
    socket.on('disconnect', this.onDisconnect);
    socket.on('connect_error', this.onConnectError);
    if (socket.connected) this.onConnect();
  }

  detach(): void {
    this.refCount -= 1;
    if (this.refCount > 0) return;
    this.refCount = 0;

    const socket = this.socket;
    if (socket !== null) {
      if (this.onConnect !== null) socket.off('connect', this.onConnect);
      if (this.onDisconnect !== null) socket.off('disconnect', this.onDisconnect);
      if (this.onConnectError !== null) socket.off('connect_error', this.onConnectError);
      for (const [event, handler] of this.boundHandlers) {
        socket.off(event, handler);
      }
    }
    this.boundHandlers.clear();
    this.onConnect = null;
    this.onDisconnect = null;
    this.onConnectError = null;
    this.socket = null;
    this.state = { ...DEFAULT_STATE };
  }

  leave(code: string, playerId: string): void {
    this.socket?.emit(SOCKET_EVENTS.ROOM_LEAVE, { code, playerId });
  }

  updateSettings(code: string, settings: RoomSettingsPatch): void {
    this.socket?.emit(SOCKET_EVENTS.ROOM_UPDATE_SETTINGS, { code, settings });
  }

  startGame(code: string): void {
    this.socket?.emit(SOCKET_EVENTS.ROOM_START_GAME, { code });
  }

  navigate(payload: PlayerNavigatePayload): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_NAVIGATE, payload);
  }

  resetGame(code: string): void {
    this.socket?.emit(SOCKET_EVENTS.GAME_RESET, { code });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): RoomStore {
    return this.state;
  }

  /**
   * Subscribes to one inbound event, validating the payload before the handler
   * sees it. Handlers are fully typed from the event name; the lone cast is
   * where socket.io's per-event listener signature meets a listener that takes
   * `unknown` because the payload is untrusted until the schema has vetted it.
   */
  private bind<E extends ServerEventName>(
    event: E,
    handler: (payload: ServerEventPayload<E>) => void,
  ): void {
    const socket = this.socket;
    if (socket === null) return;

    const schema = getServerEventSchema(event);
    const wrapped = (raw: unknown): void => {
      const result = schema.safeParse(raw);
      if (!result.success) {
        console.warn('[wikiconn] dropped malformed event', event, result.error.issues);
        return;
      }
      handler(result.data);
    };

    this.boundHandlers.set(event, wrapped);
    socket.on(event, wrapped as never);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private update(next: (prev: RoomStore) => RoomStore): void {
    this.state = next(this.state);
    this.notify();
  }
}

let singleton: RoomClient | null = null;

function getClient(): RoomClient {
  singleton ??= new RoomClient();
  return singleton;
}

function subscribeToStore(listener: Listener): () => void {
  return getClient().subscribe(listener);
}

function snapshotStore(): RoomStore {
  return getClient().snapshot();
}

function serverSnapshot(): RoomStore {
  return DEFAULT_STATE;
}

export function useRoomStore(): RoomStore {
  return useSyncExternalStore(subscribeToStore, snapshotStore, serverSnapshot);
}

export function useRoomConnection(input: {
  code: string;
  playerId: string;
  playerSecret: string;
  nickname: string | null;
}): RoomClient {
  const client = getClient();
  useEffect(() => {
    if (input.nickname === null || input.playerId.length === 0 || input.playerSecret.length === 0) {
      return;
    }
    client.attach(input.code, input.playerId, input.playerSecret, input.nickname);
    return () => {
      client.detach();
    };
  }, [client, input.code, input.playerId, input.playerSecret, input.nickname]);
  return client;
}

export function getRoomClient(): RoomClient {
  return getClient();
}
