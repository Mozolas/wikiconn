import {
  type Language,
  type RoomState,
  roomStateSchema,
  type WikiArticleResponse,
  wikiArticleResponseSchema,
  type WikiRandomResponse,
  wikiRandomResponseSchema,
  type WikiSearchResult,
  wikiSearchResponseSchema,
} from '@wikiconn/shared';
import { z } from 'zod';

import { env } from './env';

const REQUEST_TIMEOUT_MS = 15_000;

const createRoomResponseSchema = z.object({
  code: z.string(),
  hostPlayerId: z.string(),
});

const roomResponseSchema = z.object({
  room: roomStateSchema,
});

const apiErrorBodySchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  code: z.string().optional(),
});

type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.statusCode;
    this.code = body.code;
  }
}

async function http<T>(path: string, init?: RequestInit, parser?: (raw: unknown) => T): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers,
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError({ statusCode: 0, message: 'Request timed out' });
    }
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({ statusCode: 0, message: 'Network error — is the server reachable?' });
  }

  const text = await res.text();
  let body: unknown;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  if (!res.ok) {
    const parsed = apiErrorBodySchema.safeParse(body);
    if (parsed.success) throw new ApiError(parsed.data);
    throw new ApiError({ statusCode: res.status, message: res.statusText || 'Request failed' });
  }

  return parser ? parser(body) : (body as T);
}

export function createRoom(input: {
  hostPlayerId: string;
  lang: Language;
}): Promise<{ code: string; hostPlayerId: string }> {
  return http('/rooms', { method: 'POST', body: JSON.stringify(input) }, (raw) =>
    createRoomResponseSchema.parse(raw),
  );
}

export function getRoom(code: string): Promise<RoomState> {
  return http(`/rooms/${encodeURIComponent(code)}`, undefined, (raw) => {
    const parsed = roomResponseSchema.parse(raw);
    return parsed.room;
  });
}

export function searchWiki(
  lang: Language,
  q: string,
  signal?: AbortSignal,
): Promise<WikiSearchResult[]> {
  const params = new URLSearchParams({ q });
  return http(
    `/wiki/${lang}/search?${params.toString()}`,
    signal ? { signal } : undefined,
    (raw) => wikiSearchResponseSchema.parse(raw).results,
  );
}

export function fetchRandomArticle(
  lang: Language,
  signal?: AbortSignal,
): Promise<WikiRandomResponse> {
  return http(`/wiki/${lang}/random`, signal ? { signal } : undefined, (raw) =>
    wikiRandomResponseSchema.parse(raw),
  );
}

export function fetchArticle(
  lang: Language,
  slug: string,
  signal?: AbortSignal,
): Promise<WikiArticleResponse> {
  return http(`/wiki/${lang}/${encodeURIComponent(slug)}`, signal ? { signal } : undefined, (raw) =>
    wikiArticleResponseSchema.parse(raw),
  );
}
