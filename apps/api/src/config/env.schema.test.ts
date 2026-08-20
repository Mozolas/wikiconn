import { describe, expect, it } from 'vitest';

import { envSchema } from './env.schema.js';

describe('envSchema', () => {
  it('applies defaults when no values provided', () => {
    const parsed = envSchema.parse({});
    expect(parsed.PORT).toBe(3001);
    expect(parsed.REDIS_URL).toBe('redis://localhost:6380');
    expect(parsed.CORS_ORIGIN).toBe('http://localhost:3000');
    expect(parsed.TRUST_PROXY_HOPS).toBe(0);
    expect(parsed.WIKI_SEARCH_CACHE_TTL_SECONDS).toBe(300);
    expect(parsed.LOG_LEVEL).toBe('log');
    expect(parsed.NODE_ENV).toBe('development');
  });

  it('coerces numeric strings', () => {
    const parsed = envSchema.parse({ PORT: '4000', WIKI_SEARCH_CACHE_TTL_SECONDS: '7200' });
    expect(parsed.PORT).toBe(4000);
    expect(parsed.WIKI_SEARCH_CACHE_TTL_SECONDS).toBe(7200);
  });

  it('rejects a negative proxy hop count', () => {
    expect(envSchema.safeParse({ TRUST_PROXY_HOPS: '-1' }).success).toBe(false);
    expect(envSchema.parse({ TRUST_PROXY_HOPS: '1' }).TRUST_PROXY_HOPS).toBe(1);
  });

  it('rejects non-positive PORT', () => {
    expect(envSchema.safeParse({ PORT: '-1' }).success).toBe(false);
    expect(envSchema.safeParse({ PORT: '0' }).success).toBe(false);
  });

  it('rejects unknown LOG_LEVEL', () => {
    expect(envSchema.safeParse({ LOG_LEVEL: 'info' }).success).toBe(false);
  });

  // Wikimedia throttles and eventually blocks clients that do not say who they
  // are, and the failure looks like flaky article loading rather than a ban.
  it('defaults to a user agent that names the project and how to reach it', () => {
    const { WIKI_USER_AGENT: agent } = envSchema.parse({});
    expect(agent).toMatch(/^WikiConn\/\d+\.\d+/);
    expect(agent).toMatch(/https?:\/\/\S+|\S+@\S+\.\S+/);
  });
});
