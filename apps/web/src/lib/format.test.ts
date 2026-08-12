import { describe, expect, it } from 'vitest';

import { formatDuration, humanSlug, initialGrapheme } from './format';

describe('formatDuration', () => {
  it('formats sub-minute durations as MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(1500)).toBe('00:01');
    expect(formatDuration(59_999)).toBe('00:59');
    expect(formatDuration(45_000)).toBe('00:45');
  });

  it('rolls over minutes', () => {
    expect(formatDuration(60_000)).toBe('01:00');
    expect(formatDuration(11 * 60_000 + 5000)).toBe('11:05');
  });

  it('clamps negatives to zero', () => {
    expect(formatDuration(-1)).toBe('00:00');
  });
});

describe('humanSlug', () => {
  it('replaces underscores with spaces', () => {
    expect(humanSlug('Albert_Einstein')).toBe('Albert Einstein');
    expect(humanSlug('No_underscores')).toBe('No underscores');
    expect(humanSlug('NoUnderscores')).toBe('NoUnderscores');
  });
});

describe('initialGrapheme', () => {
  it('takes the first visible character', () => {
    expect(initialGrapheme('alice')).toBe('a');
    expect(initialGrapheme('  bob')).toBe('b');
  });

  it('keeps multi-code-point characters whole', () => {
    expect(initialGrapheme('👩‍🚀 astronaut')).toBe('👩‍🚀');
    expect(initialGrapheme('Žofie')).toBe('Ž');
  });

  it('falls back for an empty name', () => {
    expect(initialGrapheme('')).toBe('?');
    expect(initialGrapheme('   ')).toBe('?');
  });
});
