export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function humanSlug(slug: string): string {
  return slug.replaceAll('_', ' ');
}

/** First grapheme of a name — emoji and combining marks stay intact, unlike [0]. */
export function initialGrapheme(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '?';
  const first = new Intl.Segmenter().segment(trimmed)[Symbol.iterator]().next();
  return first.done === true ? '?' : first.value.segment;
}
