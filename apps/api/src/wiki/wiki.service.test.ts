import { afterEach, describe, expect, it, vi } from 'vitest';

import { WikiService } from './wiki.service.js';

type Ctor = ConstructorParameters<typeof WikiService>;

/** `random` needs neither cache nor sanitizer, only the configured user agent. */
function createService(): WikiService {
  return new WikiService(
    {} as unknown as Ctor[0],
    {} as unknown as Ctor[1],
    { wikiUserAgent: 'WikiConn/test' } as unknown as Ctor[2],
  );
}

function summary(body: unknown): Response {
  return Response.json(body);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WikiService.random', () => {
  it('returns the canonical slug and description of a standard article', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          summary({
            type: 'standard',
            title: 'Albert Einstein',
            description: 'German-born physicist',
            titles: { canonical: 'Albert_Einstein' },
          }),
        ),
      ),
    );

    await expect(createService().random('en')).resolves.toEqual({
      lang: 'en',
      title: 'Albert Einstein',
      slug: 'Albert_Einstein',
      description: 'German-born physicist',
    });
  });

  it('draws again when it lands on a disambiguation page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        summary({ type: 'disambiguation', title: 'Mercury', titles: { canonical: 'Mercury' } }),
      )
      .mockResolvedValueOnce(
        summary({ type: 'standard', title: 'Prague', titles: { canonical: 'Prague' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService().random('en');
    expect(result.slug).toBe('Prague');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('settles for the first draw when every attempt is a disambiguation page', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        summary({ type: 'disambiguation', title: 'Mercury', titles: { canonical: 'Mercury' } }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService().random('en');
    expect(result.slug).toBe('Mercury');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('falls back to the display title when no canonical title is given', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(summary({ title: 'Karlův most' }))),
    );

    const result = await createService().random('cs');
    expect(result).toEqual({
      lang: 'cs',
      title: 'Karlův most',
      slug: 'Karlův_most',
      description: '',
    });
  });

  it('rejects a response that does not look like a page summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(summary({ nope: true }))),
    );

    await expect(createService().random('en')).rejects.toThrow(/unexpected response/);
  });
});
