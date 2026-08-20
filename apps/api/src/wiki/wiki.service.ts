import { Injectable, Logger } from '@nestjs/common';
import { type Language, parseSlug } from '@wikiconn/shared';
import { z } from 'zod';

import { AppConfig } from '../config/app-config.service.js';
import { RedisService } from '../redis/redis.service.js';

import { WikiFetchError } from './wiki.errors.js';
import { wikiSearchResultSchema } from './wiki.types.js';

import type { WikiRandomResponse, WikiSearchResult } from './wiki.types.js';

const WIKI_FETCH_TIMEOUT_MS = 8000;

const OPENSEARCH_BASE = (lang: string): string => `https://${lang}.wikipedia.org/w/api.php`;

const RANDOM_SUMMARY_URL = (lang: string): string =>
  `https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`;

/** How many draws to spend looking for a plain article before taking what we get. */
const RANDOM_MAX_ATTEMPTS = 3;

const randomSummarySchema = z.object({
  type: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  titles: z.object({ canonical: z.string() }).optional(),
});

const openSearchTupleSchema = z.tuple([
  z.string(),
  z.array(z.string()),
  z.array(z.string()),
  z.array(z.string()),
]);

const cachedSearchSchema = z.array(wikiSearchResultSchema);

/**
 * What is left of the Wikipedia proxy once races stopped going through it: the
 * two lobby-time lookups the pickers need. Article HTML is fetched by each
 * player's own browser, which keeps race traffic off this one server's IP.
 */
@Injectable()
export class WikiService {
  private readonly logger = new Logger(WikiService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: AppConfig,
  ) {}

  async search(lang: Language, query: string, limit = 10): Promise<WikiSearchResult[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return [];

    const cacheKey = `wiki:${lang}:search:${normalized}:${String(limit)}`;
    const cached = await this.redis.raw.get(cacheKey);
    if (cached !== null) {
      const parsed = parseCache(cached, cachedSearchSchema);
      if (parsed !== null) return parsed;
    }

    const url = new URL(OPENSEARCH_BASE(lang));
    url.searchParams.set('action', 'opensearch');
    url.searchParams.set('search', normalized);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('namespace', '0');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '1');

    const json = await this.fetchJson(url, 'opensearch');
    const parsed = openSearchTupleSchema.safeParse(json);
    if (!parsed.success) {
      throw new WikiFetchError('opensearch: unexpected response');
    }
    const [, titles, descriptions, urls] = parsed.data;

    const results: WikiSearchResult[] = titles.map((title, i) => {
      const slug = parseSlug(title);
      const rawUrl = urls[i];
      return {
        title,
        description: descriptions[i] ?? '',
        url:
          rawUrl !== undefined && rawUrl.length > 0
            ? rawUrl
            : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
        slug,
      };
    });

    await this.redis.raw.set(
      cacheKey,
      JSON.stringify(results),
      'EX',
      this.config.wikiSearchCacheTtlSeconds,
    );

    return results;
  }

  /**
   * Draws a random article for the start/finish pickers. Disambiguation pages
   * make for a poor race, so a few draws are spent trying to avoid them before
   * settling for whatever came up.
   */
  async random(lang: Language): Promise<WikiRandomResponse> {
    let fallback: WikiRandomResponse | null = null;

    for (let attempt = 0; attempt < RANDOM_MAX_ATTEMPTS; attempt += 1) {
      const json = await this.fetchJson(new URL(RANDOM_SUMMARY_URL(lang)), 'random');
      const parsed = randomSummarySchema.safeParse(json);
      if (!parsed.success) throw new WikiFetchError('random: unexpected response');

      const summary = parsed.data;
      const candidate: WikiRandomResponse = {
        lang,
        title: summary.title,
        slug: parseSlug(summary.titles?.canonical ?? summary.title),
        description: summary.description ?? '',
      };
      if (summary.type === undefined || summary.type === 'standard') return candidate;
      fallback ??= candidate;
    }

    if (fallback === null) throw new WikiFetchError('random: no article drawn');
    return fallback;
  }

  /** Fetch + JSON-parse with a timeout, mapping every failure to a safe WikiFetchError. */
  private async fetchJson(url: URL, label: string): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': this.config.wikiUserAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(WIKI_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      throw this.toFetchError(error, label);
    }
    if (!res.ok) {
      throw new WikiFetchError(`${label} ${String(res.status)}`);
    }
    try {
      return await res.json();
    } catch {
      throw new WikiFetchError(`${label}: invalid JSON`);
    }
  }

  /** Map an unknown fetch rejection to a WikiFetchError without leaking internal detail. */
  private toFetchError(error: unknown, label: string): WikiFetchError {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new WikiFetchError(`${label}: timeout`);
    }
    this.logger.warn(
      `${label} fetch failed: ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return new WikiFetchError(`${label}: network error`);
  }
}

function parseCache<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
