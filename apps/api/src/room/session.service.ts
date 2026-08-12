import { Injectable } from '@nestjs/common';

export interface SocketSession {
  playerId: string;
  code: string;
}

/**
 * Tracks active socket -> player/room sessions across gateways.
 * Lives in RoomModule because RoomGateway is the entry point that creates
 * sessions, but other gateways (GameGateway) need to consult them.
 */
@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, SocketSession>();

  set(socketId: string, session: SocketSession): void {
    this.sessions.set(socketId, session);
  }

  get(socketId: string): SocketSession | undefined {
    return this.sessions.get(socketId);
  }

  delete(socketId: string): void {
    this.sessions.delete(socketId);
  }

  findBy(playerId: string, code: string): string | undefined {
    for (const [socketId, session] of this.sessions) {
      if (session.playerId === playerId && session.code === code) return socketId;
    }
    return undefined;
  }
}
