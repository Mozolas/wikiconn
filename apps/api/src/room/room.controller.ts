import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { languageSchema, playerIdSchema, roomCodeSchema } from '@wikiconn/shared';
import { z } from 'zod';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { RoomNotFoundError } from './room.errors.js';
import { RoomService } from './room.service.js';

const createRoomBodySchema = z.object({
  hostPlayerId: playerIdSchema,
  lang: languageSchema.optional(),
});

type CreateRoomBody = z.infer<typeof createRoomBodySchema>;

@Controller('rooms')
export class RoomController {
  constructor(private readonly rooms: RoomService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  async create(@Body(new ZodValidationPipe(createRoomBodySchema)) body: CreateRoomBody) {
    const result = await this.rooms.createRoom(body.hostPlayerId, body.lang ?? 'en');
    return result;
  }

  @Get(':code')
  async get(@Param('code', new ZodValidationPipe(roomCodeSchema)) code: string) {
    const state = await this.rooms.tryLoadState(code);
    if (state === null) throw new RoomNotFoundError(code);
    return { room: state };
  }
}

export type { CreateRoomBody };

export { type Language } from '@wikiconn/shared';
