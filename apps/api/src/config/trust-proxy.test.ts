import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';

import type { NestExpressApplication } from '@nestjs/platform-express';

const LIMIT = 2;
const CALLERS = 4;

@Controller('probe')
class ProbeController {
  @Get()
  hit(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: LIMIT }] })],
  controllers: [ProbeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class ProbeModule {}

/**
 * One request per distinct client address, as the proxy would forward them.
 * `forge` prepends whatever the caller itself wrote into X-Forwarded-For, which
 * a real proxy leaves in place and appends the true peer after.
 */
async function statusesForDistinctCallers(
  hops: number,
  forge: (i: number) => string = () => '',
): Promise<number[]> {
  const app = await NestFactory.create<NestExpressApplication>(ProbeModule, { logger: false });
  if (hops > 0) app.set('trust proxy', hops);
  await app.listen(0);
  const url = await app.getUrl();

  const statuses: number[] = [];
  for (let i = 1; i <= CALLERS; i += 1) {
    // Caddy appends the real peer, so the address it vouches for is the last one.
    const forwarded = `${forge(i)}203.0.113.${String(i)}`;
    const res = await fetch(`${url}/probe`, { headers: { 'X-Forwarded-For': forwarded } });
    statuses.push(res.status);
  }

  await app.close();
  return statuses;
}

describe('rate limiting behind a reverse proxy', () => {
  it('gives each forwarded client its own budget once the hop count is trusted', async () => {
    const statuses = await statusesForDistinctCallers(1);
    expect(statuses).toEqual([200, 200, 200, 200]);
  }, 20_000);

  it('ignores addresses the proxy did not vouch for', async () => {
    // One hop means one trusted entry. Everything to the left of it is whatever
    // the caller wrote, so it must not move them off their own bucket.
    const statuses = await statusesForDistinctCallers(1, () => '198.51.100.7, ');
    expect(statuses).toEqual([200, 200, 200, 200]);
  }, 20_000);

  it('lets one caller mint unlimited budgets when told to trust a hop that is not there', async () => {
    // The failure mode the hop count has to match reality to avoid. With two
    // hops trusted behind a single proxy, req.ip is read from the entry the
    // caller wrote, so rotating it walks around the limit indefinitely — four
    // requests from one address, four 200s, on a limit of two.
    const statuses = await statusesForDistinctCallers(2, (i) => `198.51.100.${String(i)}, `);
    expect(statuses).toEqual([200, 200, 200, 200]);
  }, 20_000);

  it('collapses every caller into one shared budget when it is not', async () => {
    // The state this codebase shipped in: behind Caddy every request carried the
    // proxy's own address, so one caller could exhaust the limit for everyone.
    const statuses = await statusesForDistinctCallers(0);
    expect(statuses.slice(0, LIMIT)).toEqual([200, 200]);
    expect(statuses.slice(LIMIT)).toEqual([429, 429]);
  }, 20_000);
});
