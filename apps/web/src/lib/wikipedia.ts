'use client';

import { type Language, parseSlug } from '@wikiconn/shared';

import { ApiError, API_NETWORK_ERROR, API_TIMEOUT } from '@/lib/api';
import { site } from '@/lib/site';
import { sanitizeArticle } from '@/lib/wiki-sanitizer';

export interface Article {
  lang: Language;
  slug: string;
  title: string;
  html: string;
}

const FETCH_TIMEOUT_MS = 20_000;

const articleUrl = (lang: Language, slug: string): string =>
  `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(slug)}`;

/**
 * Wikimedia asks automated clients to identify themselves, and a browser cannot
 * set User-Agent. The REST API takes Api-User-Agent instead and lists it on its
 * CORS allowlist for exactly this case. It costs a preflight per article, which
 * the cache below spends only once.
 */
const API_USER_AGENT = `WikiConn/1.0 (${site.origin}; ${site.repository})`;

/**
 * Sanitizing a megabyte of Parsoid HTML is the expensive half, so the finished
 * article is what gets kept and revisiting one costs nothing. Bounded by
 * characters rather than entries because the spread is wide — Albert Einstein
 * sanitizes to ~1.16M chars where Pizza is ~0.42M — and a thirty-hop race on a
 * phone would otherwise retain the whole route for the life of the tab.
 */
const CACHE_BUDGET_CHARS = 8_000_000;

const cache = new Map<string, Article>();
let cachedChars = 0;

/** Map iterates in insertion order, so re-inserting on a hit makes this an LRU. */
function remember(key: string, article: Article): void {
  const previous = cache.get(key);
  if (previous !== undefined) cachedChars -= previous.html.length;

  cache.set(key, article);
  cachedChars += article.html.length;

  while (cachedChars > CACHE_BUDGET_CHARS && cache.size > 1) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cachedChars -= cache.get(oldest)?.html.length ?? 0;
    cache.delete(oldest);
  }
}

/**
 * Fetches an article straight from Wikipedia to the player's own browser and
 * sanitizes it here. Nothing about a race touches the WikiConn API any more,
 * which keeps the game off a single shared IP as far as Wikimedia can see.
 */
export async function fetchArticle(
  lang: Language,
  rawSlug: string,
  signal?: AbortSignal,
): Promise<Article> {
  const slug = parseSlug(rawSlug);
  const key = `${lang}:${slug}`;

  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  let res: Response;
  try {
    res = await fetch(articleUrl(lang, slug), {
      headers: {
        'Api-User-Agent': API_USER_AGENT,
        Accept:
          'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.8.0"',
      },
      redirect: 'follow',
      // Composed, not chosen: the caller's signal cancels a stale slug, the
      // timeout bounds a Wikipedia that accepts the connection and then goes
      // quiet. Picking one over the other left the only real call site — which
      // always passes a signal — with no time bound at all, and a stalled fetch
      // parks the player on the loading skeleton with no error and no retry.
      signal: AbortSignal.any([
        ...(signal === undefined ? [] : [signal]),
        AbortSignal.timeout(FETCH_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError({ statusCode: 0, message: 'Request timed out', code: API_TIMEOUT });
    }
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({
      statusCode: 0,
      message: 'Could not reach Wikipedia',
      code: API_NETWORK_ERROR,
    });
  }

  if (res.status === 404) {
    throw new ApiError({
      statusCode: 404,
      message: `Article '${slug}' not found on ${lang}.wiki`,
      code: 'WIKI_ARTICLE_NOT_FOUND',
    });
  }
  if (!res.ok) {
    throw new ApiError({
      statusCode: res.status,
      message: `Failed to fetch from Wikipedia: html ${String(res.status)}`,
      code: 'WIKI_FETCH_FAILED',
    });
  }

  const sanitized = sanitizeArticle(await res.text(), lang);
  const article: Article = {
    lang,
    slug,
    title: sanitized.title ?? slug,
    html: sanitized.html,
  };

  remember(key, article);
  return article;
}
