export interface TocEntry {
  id: string;
  text: string;
}

/**
 * Builds Wikipedia's "Contents" list out of the sanitized article HTML.
 * Only top-level sections are listed — the same thing Vector 2022 shows
 * collapsed — and headings without an id are skipped because they cannot be
 * linked to.
 */
export function extractToc(html: string): TocEntry[] {
  if (!('DOMParser' in globalThis)) return [];

  const doc = new globalThis.DOMParser().parseFromString(html, 'text/html');
  const entries: TocEntry[] = [];
  const seen = new Set<string>();

  for (const heading of doc.querySelectorAll('h2[id]')) {
    const id = heading.id;
    const text = heading.textContent.trim();
    if (id.length === 0 || text.length === 0 || seen.has(id)) continue;
    seen.add(id);
    entries.push({ id, text });
  }

  return entries;
}
