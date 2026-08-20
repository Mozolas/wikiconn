import { Module } from '@nestjs/common';

import { RoomModule } from '../room/room.module.js';

import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';

@Module({
  imports: [RoomModule],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
