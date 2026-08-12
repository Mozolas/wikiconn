import { Global, Logger, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

import { AppConfig } from '../config/app-config.service.js';

import { REDIS_CLIENT } from './redis.constants.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Redis => {
        const client = new Redis(config.redisUrl, {
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });

        const logger = new Logger('RedisClient');
        client.on('connect', () => {
          logger.log('connected');
        });
        client.on('error', (error: Error) => {
          logger.error(`error: ${error.message}`);
        });

        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly service: RedisService) {}

  async onModuleInit(): Promise<void> {
    await this.service.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.service.quit();
  }
}
