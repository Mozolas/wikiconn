import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';

import { RedisService } from '../redis/redis.service.js';

interface HealthResponse {
  status: 'ok';
  uptime: number;
  redis: 'ok';
  timestamp: number;
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly redis: RedisService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error(`Unexpected ping response: ${pong}`);
      }
    } catch (error) {
      this.logger.warn(
        `health check failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new ServiceUnavailableException({ status: 'degraded', redis: 'down' });
    }

    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      redis: 'ok',
      timestamp: Date.now(),
    };
  }
}
