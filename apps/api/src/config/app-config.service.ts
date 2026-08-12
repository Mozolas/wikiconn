import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnv } from './env.schema.js';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get corsOrigin(): string {
    return this.config.get('CORS_ORIGIN', { infer: true });
  }

  get wikiCacheTtlSeconds(): number {
    return this.config.get('WIKI_CACHE_TTL_SECONDS', { infer: true });
  }

  get wikiSearchCacheTtlSeconds(): number {
    return this.config.get('WIKI_SEARCH_CACHE_TTL_SECONDS', { infer: true });
  }

  get wikiUserAgent(): string {
    return this.config.get('WIKI_USER_AGENT', { infer: true });
  }

  get logLevel(): AppEnv['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get nodeEnv(): AppEnv['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }
}
