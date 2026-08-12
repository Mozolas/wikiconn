import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  REDIS_URL: z.string().min(1).default('redis://localhost:6380'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  WIKI_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  WIKI_SEARCH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  // Wikimedia's User-Agent policy asks automated clients to identify themselves
  // and to offer a way of reaching whoever runs them. Anonymous or generic
  // agents get rate limited and eventually blocked.
  WIKI_USER_AGENT: z.string().min(1).default('WikiConn/1.0 (https://github.com/Mozolas/wikiconn)'),
  LOG_LEVEL: z.enum(['log', 'error', 'warn', 'debug', 'verbose']).default('log'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type AppEnv = z.infer<typeof envSchema>;
