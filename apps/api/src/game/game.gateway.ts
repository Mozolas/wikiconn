import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type ClientToServerEvents,
  type ErrorPayload,
  type RoomStatePayload,
  type ServerToClientEvents,
  SOCKET_EVENTS,
  errorPayloadSchema,
  gameResetPayloadSchema,
  playerNavigatePayloadSchema,
  roomStartGamePayloadSchema,
} from '@wikiconn/shared';
import { ZodError, type z, type ZodType } from 'zod';

import { WsAppError } from '../room/room.errors.js';
import { SessionService } from '../room/session.service.js';

import { GameService } from './game.service.js';

import type { Server, Socket } from 'socket.io';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  transports: ['websocket', 'polling'],
})
export class GameGateway {
  @WebSocketServer()
  readonly server!: TypedServer;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly game: GameService,
    private readonly sessions: SessionService,
  ) {}

  @SubscribeMessage(SOCKET_EVENTS.ROOM_START_GAME)
  async onStartGame(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const payload = this.parse(roomStartGamePayloadSchema, body, socket);
    if (payload === null) return;

    const session = this.sessions.get(socket.id);
    if (session?.code !== payload.code) {
      this.sendError(socket, new WsAppError('INVALID_PAYLOAD', 'No active session for this room'));
      return;
    }

    try {
      const result = await this.game.startGame(payload.code, session.playerId);
      this.server.to(payload.code).emit(SOCKET_EVENTS.GAME_STARTED, result.payload);
      this.broadcastState(payload.code, result.state);
      this.logger.log(`Game started in ${payload.code}`);
    } catch (error) {
      this.sendError(socket, error);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.PLAYER_NAVIGATE)
  async onPlayerNavigate(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const payload = this.parse(playerNavigatePayloadSchema, body, socket);
    if (payload === null) return;

    const session = this.sessions.get(socket.id);
    if (session?.code !== payload.code || session.playerId !== payload.playerId) {
      this.sendError(socket, new WsAppError('INVALID_PAYLOAD', 'Session/payload mismatch'));
      return;
    }

    try {
      const result = await this.game.navigate(
        payload.code,
        payload.playerId,
        payload.fromSlug,
        payload.toSlug,
      );
      this.server.to(payload.code).emit(SOCKET_EVENTS.GAME_PLAYER_MOVED, result.payload);
      this.broadcastState(payload.code, result.state);
      if (result.won !== undefined) {
        this.server.to(payload.code).emit(SOCKET_EVENTS.GAME_WON, result.won);
        this.logger.log(`Game won in ${payload.code} by ${result.won.winnerId}`);
      }
    } catch (error) {
      this.sendError(socket, error);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_RESET)
  async onGameReset(
    @ConnectedSocket() socket: TypedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const payload = this.parse(gameResetPayloadSchema, body, socket);
    if (payload === null) return;

    const session = this.sessions.get(socket.id);
    if (session?.code !== payload.code) {
      this.sendError(socket, new WsAppError('INVALID_PAYLOAD', 'No active session for this room'));
      return;
    }

    try {
      const result = await this.game.resetGame(payload.code, session.playerId);
      this.broadcastState(payload.code, result.state);
      this.logger.log(`Game reset in ${payload.code}`);
    } catch (error) {
      this.sendError(socket, error);
    }
  }

  private broadcastState(code: string, room: RoomStatePayload['room']): void {
    const payload: RoomStatePayload = { room };
    this.server.to(code).emit(SOCKET_EVENTS.ROOM_STATE, payload);
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
      payload = {
        code: 'INVALID_PAYLOAD',
        message: error.issues[0]?.message ?? 'invalid payload',
      };
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
