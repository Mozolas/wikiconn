import { IoAdapter } from '@nestjs/platform-socket.io';

import type { INestApplicationContext } from '@nestjs/common';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter that pins CORS to a single allowed origin (with credentials)
 * and caps the per-message buffer size. This is the single source of truth for
 * WebSocket CORS — gateways must not set `cors` on their decorators.
 */
export class CorsIoAdapter extends IoAdapter {
  private readonly corsOrigin: string;

  constructor(app: INestApplicationContext, corsOrigin: string) {
    super(app);
    this.corsOrigin = corsOrigin;
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
      maxHttpBufferSize: 1e5,
    }) as Server;
  }
}
