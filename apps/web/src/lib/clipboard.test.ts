import { afterEach, describe, expect, it, vi } from 'vitest';

function stubClipboard(value: unknown): void {
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis.navigator, 'clipboard');
});

describe('copyText', () => {
  it('reports failure when the clipboard API is unavailable', async () => {
    const { copyText } = await import('./clipboard');
    await expect(copyText('ABCDEF')).resolves.toBe(false);
  });

  it('writes through the clipboard API when present', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard({ writeText });

    const { copyText } = await import('./clipboard');
    await expect(copyText('ABCDEF')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('ABCDEF');
  });

  it('reports failure when the browser rejects the write', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });

    const { copyText } = await import('./clipboard');
    await expect(copyText('ABCDEF')).resolves.toBe(false);
  });
});
