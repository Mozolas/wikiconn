import { Module } from '@nestjs/common';

import { RoomController } from './room.controller.js';
import { RoomGateway } from './room.gateway.js';
import { RoomRepository } from './room.repository.js';
import { RoomService } from './room.service.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RoomRepository, RoomGateway, SessionService],
  exports: [RoomService, RoomRepository, RoomGateway, SessionService],
})
export class RoomModule {}
