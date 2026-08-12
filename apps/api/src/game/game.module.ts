import { Module } from '@nestjs/common';

import { RoomModule } from '../room/room.module.js';
import { WikiModule } from '../wiki/wiki.module.js';

import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';

@Module({
  imports: [RoomModule, WikiModule],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
