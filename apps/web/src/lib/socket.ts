'use client';

import {
  type ClientToServerEvents,
  errorEventPayloadSchema,
  gamePlayerMovedPayloadSchema,
  gameStartedPayloadSchema,
  gameWonPayloadSchema,
  roomPlayerJoinedPayloadSchema,
  roomPlayerLeftPayloadSchema,
  roomSettingsUpdatedPayloadSchema,
  roomStatePayloadSchema,
  type ServerToClientEvents,
} from '@wikiconn/shared';
import { io, type Socket } from 'socket.io-client';
import { type ZodType } from 'zod';

import { env } from './env';

export type WikiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ServerEventName = keyof ServerToClientEvents;

export type ServerEventPayload<E extends ServerEventName> = Parameters<ServerToClientEvents[E]>[0];

/**
 * One schema per inbound event. The mapped type makes the compiler check that a
 * schema actually produces the payload its event promises, so a renamed field
 * cannot silently drift apart from the contract in `packages/shared`.
 */
const SERVER_EVENT_SCHEMAS: { [E in ServerEventName]: ZodType<ServerEventPayload<E>> } = {
  'room:state': roomStatePayloadSchema,
  'room:player-joined': roomPlayerJoinedPayloadSchema,
  'room:player-left': roomPlayerLeftPayloadSchema,
  'room:settings-updated': roomSettingsUpdatedPayloadSchema,
  'game:started': gameStartedPayloadSchema,
  'game:player-moved': gamePlayerMovedPayloadSchema,
  'game:won': gameWonPayloadSchema,
  error: errorEventPayloadSchema,
};

export function getServerEventSchema<E extends ServerEventName>(
  event: E,
): ZodType<ServerEventPayload<E>> {
  return SERVER_EVENT_SCHEMAS[event];
}

let socket: WikiSocket | null = null;

export function getSocket(): WikiSocket {
  socket ??= io(env.socketUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Number.POSITIVE_INFINITY,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket !== null) {
    socket.disconnect();
    socket = null;
  }
}
