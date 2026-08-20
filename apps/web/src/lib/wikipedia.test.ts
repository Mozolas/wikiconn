import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as WikipediaModule from '@/lib/wikipedia';

/** The module keeps a cache, so each test gets its own copy of it. */
async function freshModule(): Promise<typeof WikipediaModule> {
  vi.resetModules();
  return import('@/lib/wikipedia');
}

function htmlResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchArticle', () => {
  it('identifies itself to Wikimedia and asks the right wiki for the right slug', async () => {
    const fetchMock = vi.fn().mockImplementation(() => htmlResponse('<h1>Praha</h1><p>x</p>'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchArticle } = await freshModule();
    const article = await fetchArticle('cs', 'Praha');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://cs.wikipedia.org/api/rest_v1/page/html/Praha');
    const headers = init.headers as Record<string, string>;
    // A browser cannot set User-Agent; this header is the whole compliance story.
    expect(headers['Api-User-Agent']).toMatch(/^WikiConn\/1\.0 \(https?:\/\/.+\)$/);
    expect(article.title).toBe('Praha');
  });

  it('normalizes the slug before asking', async () => {
    const fetchMock = vi.fn().mockImplementation(() => htmlResponse('<p>x</p>'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchArticle } = await freshModule();
    await fetchArticle('en', './Albert%20Einstein');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://en.wikipedia.org/api/rest_v1/page/html/Albert_Einstein',
    );
  });

  it('maps a missing article onto the code the dictionary translates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Response('', { status: 404 })),
    );

    const { fetchArticle } = await freshModule();
    await expect(fetchArticle('en', 'Nonexistent_Article')).rejects.toMatchObject({
      code: 'WIKI_ARTICLE_NOT_FOUND',
      status: 404,
    });
  });

  it('maps any other upstream failure onto WIKI_FETCH_FAILED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Response('', { status: 429 })),
    );

    const { fetchArticle } = await freshModule();
    const error = (await fetchArticle('en', 'Rate_Limited').catch((error_: unknown) => error_)) as {
      name: string;
      code: string;
      status: number;
    };
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('WIKI_FETCH_FAILED');
    expect(error.status).toBe(429);
  });

  it('reports an unreachable Wikipedia as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { fetchArticle } = await freshModule();
    await expect(fetchArticle('en', 'Offline')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('rethrows an abort rather than dressing it as an error', async () => {
    // play-view leans on this to stay quiet when a hop is superseded mid-flight.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));

    const { fetchArticle } = await freshModule();
    const error = (await fetchArticle('en', 'Aborted').catch((error_: unknown) => error_)) as {
      name: string;
      status?: number;
    };
    // Not repackaged as an ApiError, which is what play-view checks for: it
    // returns early on an abort instead of toasting the player.
    expect(error.name).toBe('AbortError');
    expect(error.status).toBeUndefined();
  });

  it('still bounds the request when the caller supplies its own signal', async () => {
    // The regression this guards: composing the two signals was once a choice
    // between them, which left the only real call site with no time bound.
    const controller = new AbortController();
    let handed: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        handed = init.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason as Error);
          });
        });
      }),
    );

    const { fetchArticle } = await freshModule();
    const pending = fetchArticle('en', 'Stalled', controller.signal).catch(
      (error_: unknown) => error_,
    );

    expect(handed).toBeDefined();
    expect(handed).not.toBe(controller.signal);

    const error = await Promise.race([
      pending,
      new Promise((resolve) => {
        setTimeout(() => {
          resolve('still hanging');
        }, 100);
      }),
    ]);
    // Not asserting it has already fired — only that the caller's signal did not
    // replace the timeout, which is what `handed !== controller.signal` shows.
    expect(error).toBe('still hanging');
    controller.abort();
  });

  it('serves a repeat visit from cache without asking Wikipedia twice', async () => {
    const fetchMock = vi.fn().mockImplementation(() => htmlResponse('<h1>Physics</h1>'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchArticle } = await freshModule();
    const first = await fetchArticle('en', 'Physics');
    const second = await fetchArticle('en', 'Physics');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('caches per wiki, not per slug alone', async () => {
    const fetchMock = vi.fn().mockImplementation(() => htmlResponse('<p>x</p>'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchArticle } = await freshModule();
    await fetchArticle('en', 'Praha');
    await fetchArticle('cs', 'Praha');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('evicts the least recently used article once the budget is spent', async () => {
    // Three articles of ~3.2M chars each against an 8M budget: the third forces
    // the first out, and re-reading the second in between makes it the survivor.
    const big = '<p>' + 'x'.repeat(3_200_000) + '</p>';
    const fetchMock = vi.fn().mockImplementation(() => htmlResponse(big));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchArticle } = await freshModule();
    await fetchArticle('en', 'One');
    await fetchArticle('en', 'Two');
    await fetchArticle('en', 'One');
    await fetchArticle('en', 'Three');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await fetchArticle('en', 'Two');
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await fetchArticle('en', 'Three');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
