import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get raw(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async quit(): Promise<void> {
    if (this.client.status === 'end') return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
