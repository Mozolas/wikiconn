import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ClientToServerEvents,
  type ErrorPayload,
  type RoomLeavePayload,
  type RoomSettingsUpdatedPayload,
  type RoomStatePayload,
  type ServerToClientEvents,
  SOCKET_EVENTS,
  errorPayloadSchema,
  roomJoinPayloadSchema,
  roomLeavePayloadSchema,
  roomUpdateSettingsPayloadSchema,
} from '@wikiconn/shared';
import { Server, Socket } from 'socket.io';
import { ZodError, type z, type ZodType } from 'zod';

import { WsAppError } from './room.errors.js';
import { RoomService } from './room.service.js';
import { SessionService } from './session.service.js';

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  transports: ['websocket', 'polling'],
})
export class RoomGateway implements OnGatewayDisconnect, OnApplicationShutdown {
  @WebSocketServer()
  readonly server!: TypedServer;

  private readonly logger = new Logger(RoomGateway.name);

  constructor(
    private readonly rooms: RoomService,
    private readonly sessions: SessionService,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    // Close sockets cleanly before Redis is torn down by its own shutdown hook.
    this.server.disconnectSockets(true);
    await this.server.close();
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_JOIN)
  async onRoomJoin(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const payload = this.parse(roomJoinPayloadSchema, body, socket);
    if (payload === null) return;

    try {
      const { room, joined } = await this.rooms.joinRoom(payload);

      // Evict any previous socket for the same player so reconnects don't leave
      // a stale session that later tears down the live one on its disconnect.
      const previous = this.sessions.findBy(payload.playerId, payload.code);
      if (previous !== undefined && previous !== socket.id) {
        this.sessions.delete(previous);
        this.server.sockets.sockets.get(previous)?.disconnect(true);
      }
      this.sessions.set(socket.id, { playerId: payload.playerId, code: payload.code });

      await socket.join(payload.code);
      const statePayload: RoomStatePayload = { room };
      socket.emit(SOCKET_EVENTS.ROOM_STATE, statePayload);
      this.broadcastState(payload.code, room);
      if (joined) {
        socket.to(payload.code).emit(SOCKET_EVENTS.ROOM_PLAYER_JOINED, {
          playerId: payload.playerId,
          nickname: payload.nickname,
        });
      }
    } catch (error) {
      this.sendError(socket, error);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_LEAVE)
  async onRoomLeave(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const payload = this.parse(roomLeavePayloadSchema, body, socket);
    if (payload === null) return;

    const session = this.sessions.get(socket.id);
    if (session?.code !== payload.code || session.playerId !== payload.playerId) {
      this.sendError(socket, new WsAppError('INVALID_PAYLOAD', 'Session/payload mismatch'));
      return;
    }

    await this.handleLeave(socket, payload);
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_UPDATE_SETTINGS)
  async onRoomUpdateSettings(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const payload = this.parse(roomUpdateSettingsPayloadSchema, body, socket);
    if (payload === null) return;

    const session = this.sessions.get(socket.id);
    if (session?.code !== payload.code) {
      this.sendError(socket, new WsAppError('INVALID_PAYLOAD', 'No active session for this room'));
      return;
    }

    try {
      const room = await this.rooms.updateSettings(
        payload.code,
        session.playerId,
        payload.settings,
      );
      const updatedPayload: RoomSettingsUpdatedPayload = { settings: payload.settings };
      this.server.to(payload.code).emit(SOCKET_EVENTS.ROOM_SETTINGS_UPDATED, updatedPayload);
      this.broadcastState(payload.code, room);
    } catch (error) {
      this.sendError(socket, error);
    }
  }

  async handleDisconnect(socket: TypedSocket): Promise<void> {
    try {
      const session = this.sessions.get(socket.id);
      if (session === undefined) return;
      this.sessions.delete(socket.id);

      // The player may have already reconnected on a newer socket — if so, leave
      // their live session untouched.
      if (this.sessions.findBy(session.playerId, session.code) !== undefined) return;

      const state = await this.rooms.tryLoadState(session.code);
      if (state === null) return;

      if (state.status === 'lobby') {
        await this.handleLeave(socket, { code: session.code, playerId: session.playerId });
        return;
      }

      await this.rooms.setConnected(session.code, session.playerId, false);
      const refreshed = await this.rooms.tryLoadState(session.code);
      if (refreshed !== null) this.broadcastState(session.code, refreshed);
    } catch (error) {
      this.logger.error(
        `disconnect handling failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  broadcastState(code: string, room: RoomStatePayload['room']): void {
    const payload: RoomStatePayload = { room };
    this.server.to(code).emit(SOCKET_EVENTS.ROOM_STATE, payload);
  }

  private async handleLeave(socket: TypedSocket, payload: RoomLeavePayload): Promise<void> {
    try {
      const result = await this.rooms.leaveRoom(payload.code, payload.playerId);
      this.sessions.delete(socket.id);
      await socket.leave(payload.code);
      this.server.to(payload.code).emit(SOCKET_EVENTS.ROOM_PLAYER_LEFT, {
        playerId: payload.playerId,
      });
      if (result.deleted) {
        this.logger.log(`Room ${payload.code} deleted after player ${payload.playerId} left`);
        return;
      }
      if (result.room !== undefined) this.broadcastState(payload.code, result.room);
    } catch (error) {
      this.sendError(socket, error);
    }
  }

  private parse<TSchema extends ZodType>(
    schema: TSchema,
    body: unknown,
    socket: TypedSocket,
  ): z.infer<TSchema> | null {
    try {
      return schema.parse(body);
    } catch (error) {
      this.sendError(socket, error);
      return null;
    }
  }

  private sendError(socket: TypedSocket, error: unknown): void {
    let payload: ErrorPayload;
    if (error instanceof WsAppError) {
      payload = error.toBody();
    } else if (error instanceof ZodError) {
      payload = { code: 'INVALID_PAYLOAD', message: error.issues[0]?.message ?? 'invalid payload' };
    } else {
      this.logger.error(error instanceof Error ? error.stack : String(error));
      payload = { code: 'INTERNAL_ERROR', message: 'internal error' };
    }
    const result = errorPayloadSchema.safeParse(payload);
    socket.emit(
      SOCKET_EVENTS.ERROR,
      result.success ? result.data : { code: 'INTERNAL_ERROR', message: 'internal error' },
    );
  }
}
