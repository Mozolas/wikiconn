import { describe, expect, it } from 'vitest';

import { extractToc } from './article-toc';

describe('extractToc', () => {
  it('lists top-level sections in document order', () => {
    const html =
      '<section><h2 id="History">History</h2><p>x</p><h3 id="Early">Early</h3></section>' +
      '<section><h2 id="Legacy">Legacy</h2></section>';
    expect(extractToc(html)).toEqual([
      { id: 'History', text: 'History' },
      { id: 'Legacy', text: 'Legacy' },
    ]);
  });

  it('skips headings that cannot be linked to', () => {
    const html = '<h2>No id</h2><h2 id="">Empty id</h2><h2 id="Ok">Ok</h2>';
    expect(extractToc(html)).toEqual([{ id: 'Ok', text: 'Ok' }]);
  });

  it('drops empty headings and duplicate ids', () => {
    const html = '<h2 id="A">A</h2><h2 id="A">A again</h2><h2 id="B">   </h2>';
    expect(extractToc(html)).toEqual([{ id: 'A', text: 'A' }]);
  });

  it('flattens markup inside a heading into plain text', () => {
    const html = '<h2 id="S"><span>Early</span> <i>life</i></h2>';
    expect(extractToc(html)).toEqual([{ id: 'S', text: 'Early life' }]);
  });

  it('returns nothing for an article without sections', () => {
    expect(extractToc('<p>just a lead paragraph</p>')).toEqual([]);
  });
});
