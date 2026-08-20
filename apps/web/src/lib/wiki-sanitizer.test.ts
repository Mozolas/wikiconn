import { describe, expect, it } from 'vitest';

import { sanitizeArticle } from '@/lib/wiki-sanitizer';

describe('sanitizeArticle', () => {
  it('removes script tags', () => {
    const html = '<p>before</p><script>alert(1)</script><p>after</p>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('<p>before</p>');
    expect(out).toContain('<p>after</p>');
  });

  it('removes style and noscript', () => {
    const html = '<style>a{color:red}</style><noscript>x</noscript><p>hi</p>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('<style');
    expect(out).not.toContain('<noscript');
  });

  it('strips inline event handlers', () => {
    const html = '<a href="./Foo" onclick="bad()" onmouseover="x()">x</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onmouseover');
  });

  it('rewrites internal article links to defanged form', () => {
    const html = '<p><a href="./Albert_Einstein">Einstein</a></p>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('data-wiki-slug="Albert_Einstein"');
    expect(out).toContain('data-wiki-lang="en"');
    expect(out).toContain('href="#wiki/en/Albert_Einstein"');
  });

  it('handles /wiki/ prefix as internal', () => {
    const html = '<a href="/wiki/Praha">Praha</a>';
    const { html: out } = sanitizeArticle(html, 'cs');
    expect(out).toContain('data-wiki-slug="Praha"');
    expect(out).toContain('data-wiki-lang="cs"');
  });

  it('strips Parsoid relative prefix and decodes percent encoding', () => {
    const html = '<a href="./Albert%20Einstein">E</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('data-wiki-slug="Albert_Einstein"');
  });

  it('marks namespace links so the FE skips them', () => {
    const html = '<a href="./Special:Random">random</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('data-wiki-skip="namespace"');
    expect(out).not.toContain('data-wiki-slug=');
  });

  it('treats Czech namespace prefixes as namespaces too', () => {
    const html = '<a href="./Soubor:Foo.png">soubor</a><a href="./Kategorie:Astronomie">cat</a>';
    const { html: out } = sanitizeArticle(html, 'cs');
    expect(out.match(/data-wiki-skip="namespace"/g)).toHaveLength(2);
    expect(out).not.toContain('data-wiki-slug=');
  });

  it('neutralises red links to articles that do not exist', () => {
    const html =
      '<a href="./Nonexistent?action=edit&amp;redlink=1" class="new">missing</a>' +
      '<a href="/wiki/Other?action=edit" class="new">also missing</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out.match(/data-wiki-skip="redlink"/g)).toHaveLength(2);
    expect(out).not.toContain('data-wiki-slug=');
    expect(out).toContain('missing');
  });

  it('keeps the Parsoid typeof so the client can style thumbnails', () => {
    const html =
      '<figure typeof="mw:File/Thumb" class="mw-halign-right">' +
      '<img src="https://upload.wikimedia.org/x.png" alt="x"><figcaption>cap</figcaption></figure>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('typeof="mw:File/Thumb"');
    expect(out).toContain('class="mw-halign-right"');
    expect(out).toContain('<figcaption>cap</figcaption>');
  });

  it('defangs external http(s) and protocol-relative links', () => {
    const html =
      '<a href="https://example.com">x</a>' +
      '<a href="http://evil.com">y</a>' +
      '<a href="//cdn.com/x">z</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toMatch(/(?<!-)href="https?:/);
    expect(out).not.toMatch(/(?<!-)href="\/\//);
    expect(out).toContain('data-external-href="https://example.com"');
    expect(out).toContain('data-external-href="http://evil.com"');
    expect(out).toContain('data-external-href="//cdn.com/x"');
  });

  it('upgrades protocol-relative image URLs to https', () => {
    const html = '<img src="//upload.wikimedia.org/foo.png" alt="x">';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('src="https://upload.wikimedia.org/foo.png"');
  });

  it('adds lazy loading to images', () => {
    const html = '<img src="https://upload.wikimedia.org/x.png" alt="x">';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('decoding="async"');
  });

  it('extracts title from the first h1', () => {
    const html = '<h1>Albert Einstein</h1><p>...</p>';
    const { title } = sanitizeArticle(html, 'en');
    expect(title).toBe('Albert Einstein');
  });

  it('returns undefined title when no h1 present', () => {
    const html = '<p>just a paragraph</p>';
    const { title } = sanitizeArticle(html, 'en');
    expect(title).toBeUndefined();
  });

  it('leaves non-article anchors (#fragment) without breaking', () => {
    const html = '<a href="#Notes">notes</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('data-wiki-slug=');
    expect(out).toContain('<a');
  });

  it('strips event handlers even when no onclick/onload/onerror is present', () => {
    const html =
      '<div onmouseover="alert(1)">a</div>' +
      '<details ontoggle="alert(2)" open>b</details>' +
      '<p onfocus="alert(3)" tabindex="0">c</p>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out.toLowerCase()).not.toContain('onmouseover');
    expect(out.toLowerCase()).not.toContain('ontoggle');
    expect(out.toLowerCase()).not.toContain('onfocus');
    expect(out).not.toContain('alert(');
  });

  it('removes iframe, object, embed and form along with their content', () => {
    const html =
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>' +
      '<object data="javascript:alert(1)"></object>' +
      '<embed src="javascript:alert(1)">' +
      '<form action="javascript:alert(1)"><p>inner</p></form>' +
      '<p>kept</p>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<object');
    expect(out).not.toContain('<embed');
    expect(out).not.toContain('<form');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('<p>kept</p>');
  });

  it('removes svg/math wrappers and any handlers inside them', () => {
    const html = '<svg><animate onbegin="alert(1)"></animate></svg><math><mi>x</mi></math>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('<svg');
    expect(out).not.toContain('<animate');
    expect(out).not.toContain('<math');
    expect(out).not.toContain('onbegin');
  });

  it('strips javascript: and data: hrefs from anchors', () => {
    const html =
      '<a href="javascript:alert(1)">x</a>' +
      '<a href="data:text/html,<script>alert(1)</script>">y</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('data:text/html');
    expect(out).not.toMatch(/href="javascript/);
  });

  it('removes style attributes (clickjacking / CSS exfiltration vector)', () => {
    const html = '<div style="position:fixed;inset:0">overlay</div>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('style=');
    expect(out).toContain('overlay');
  });

  it('unwraps disallowed tags but keeps their text content', () => {
    const html = '<center><font color="red">hello</font></center>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('<center');
    expect(out).not.toContain('<font');
    expect(out).toContain('hello');
  });

  it('drops non-https image sources', () => {
    const html = '<img src="javascript:alert(1)" alt="x"><img src="http://evil.com/x.png" alt="y">';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('src="http://');
    expect(out).toContain('src="https://evil.com/x.png"');
  });
  it('refuses to carry in the data-wiki-* attributes it writes itself', () => {
    // Nothing cross-checks these any more: the server dropped its copy of the
    // link set, so a slug smuggled through the HTML would be a link to anywhere.
    const html =
      '<a data-wiki-slug="Target" data-wiki-lang="en">no href</a>' +
      '<a href="https://example.com" data-wiki-slug="Target">external</a>' +
      '<span data-wiki-skip="redlink" data-external-href="https://evil.example">x</span>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('data-wiki-slug="Target"');
    expect(out).not.toContain('data-wiki-skip="redlink"');
    expect(out).not.toContain('evil.example');
  });

  it('still rewrites a real internal link after clearing what came in', () => {
    const html = '<a href="./Physics" data-wiki-slug="Target">physics</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('data-wiki-slug="Physics"');
    expect(out).not.toContain('data-wiki-slug="Target"');
  });

  it('drops a non-https srcset even on elements the <img> pass never touches', () => {
    // <picture>/<source> are on the tag allowlist but skip the <img> rewrite, so
    // before this the allowlist pass took any srcset verbatim. Note the bar is
    // the scheme, not the host: <img src> has never been host-restricted either.
    const html =
      '<picture><source srcset="http://insecure.example/x.png 2x"></picture>' +
      '<picture><source srcset="//protocol.example/y.png"></picture>' +
      '<picture><source srcset="https://upload.wikimedia.org/a.png 1x, http://b.example/b.png 2x"></picture>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).not.toContain('insecure.example');
    expect(out).not.toContain('protocol.example');
    // One bad candidate condemns the whole attribute rather than half of it.
    expect(out).not.toContain('b.example');
    expect(out).not.toContain('srcset=');
  });

  it('keeps an https srcset on a source element', () => {
    const html = '<picture><source srcset="https://upload.wikimedia.org/x.png 2x"></picture>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('srcset="https://upload.wikimedia.org/x.png 2x"');
  });

  it('defangs namespaces the wikis actually emit mid-article', () => {
    // cs:Praha carries sixteen Speciální:Zdroje_knih links from its ISBN
    // templates, and en articles link Template_talk. Both 403 on the REST API,
    // so following one costs the racer a click and shows an error.
    const html =
      '<a href="./Speciální:Zdroje_knih/978-80-200-1234-5">ISBN</a>' +
      '<a href="./Template_talk:Infobox">talk</a>' +
      '<a href="./Diskuse_s_wikipedistou:Nekdo">user talk</a>';
    const { html: out } = sanitizeArticle(html, 'cs');
    expect(out.match(/data-wiki-skip="namespace"/g)).toHaveLength(3);
    expect(out).not.toContain('data-wiki-slug=');
  });

  it('leaves an ordinary title containing a colon alone', () => {
    const html = '<a href="./Star_Trek:_Nemesis">film</a>';
    const { html: out } = sanitizeArticle(html, 'en');
    expect(out).toContain('data-wiki-slug="Star_Trek:_Nemesis"');
    expect(out).not.toContain('data-wiki-skip=');
  });
});
