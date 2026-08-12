import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppConfigModule } from './config/app-config.module.js';
import { GameModule } from './game/game.module.js';
import { HealthModule } from './health/health.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RoomModule } from './room/room.module.js';
import { WikiModule } from './wiki/wiki.module.js';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    RedisModule,
    HealthModule,
    WikiModule,
    RoomModule,
    GameModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
