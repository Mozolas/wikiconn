import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  REDIS_URL: z.string().min(1).default('redis://localhost:6380'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  // Reverse proxy hops in front of this process. Rate limiting buckets by
  // req.ip, and Express only reads X-Forwarded-For once it is told how far to
  // trust it; left at 0 behind Caddy every caller shares one bucket, and set
  // above the real hop count a caller can forge the header and dodge the limit
  // entirely. Deployments set it (see docker-compose.prod.yml); 0 suits a
  // process reached directly, which is how `pnpm dev` runs it.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  WIKI_SEARCH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  // Wikimedia's User-Agent policy asks automated clients to identify themselves
  // and to offer a way of reaching whoever runs them. Anonymous or generic
  // agents get rate limited and eventually blocked.
  WIKI_USER_AGENT: z.string().min(1).default('WikiConn/1.0 (https://github.com/Mozolas/wikiconn)'),
  LOG_LEVEL: z.enum(['log', 'error', 'warn', 'debug', 'verbose']).default('log'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type AppEnv = z.infer<typeof envSchema>;
