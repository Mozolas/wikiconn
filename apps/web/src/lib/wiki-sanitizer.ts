import { type Language, parseSlug } from '@wikiconn/shared';

export interface SanitizeResult {
  html: string;
  title: string | undefined;
}

/**
 * Every non-article namespace on the two supported wikis, plus their aliases,
 * taken from each wiki's own siteinfo. A link into one of these is not a move a
 * racer can make: the REST API answers 403 for `Speciální:Zdroje_knih/...`, and
 * cs:Praha alone carries sixteen of those from its ISBN templates.
 */
const NAMESPACE_PREFIXES = new Set([
  'Category',
  'Category_talk',
  'Diskuse',
  'Diskuse_k_MediaWiki',
  'Diskuse_k_Wikipedii',
  'Diskuse_k_modulu',
  'Diskuse_k_nápovědě',
  'Diskuse_k_portálu',
  'Diskuse_k_rejstříku',
  'Diskuse_k_souboru',
  'Diskuse_k_šabloně',
  'Diskuse_ke_kategorii',
  'Diskuse_s_uživatelem',
  'Diskuse_s_wikipedistkou',
  'Diskuse_s_wikipedistou',
  'Diskusia_k_obrázku',
  'Diskusia_k_podujatiu',
  'Diskusia_s_redaktorom',
  'Draft',
  'Draft_talk',
  'Event',
  'Event_talk',
  'File',
  'File_talk',
  'Help',
  'Help_talk',
  'Image',
  'Image_talk',
  'Kat',
  'Kategorie',
  'Kategorie_diskuse',
  'Komentár',
  'Komentár_k_MediaWiki',
  'Komentár_k_Wikipédii',
  'Komentár_k_obrázku',
  'Komentár_k_redaktorovi',
  'MOS',
  'MOS_talk',
  'Media',
  'MediaWiki',
  'MediaWiki_diskuse',
  'MediaWiki_talk',
  'Modul',
  'Module',
  'Module_talk',
  'Média',
  'Nápověda',
  'Nápověda_diskuse',
  'Obrázok',
  'Podujatie',
  'Portal',
  'Portal_talk',
  'Portál',
  'Portál_diskuse',
  'Project',
  'Redaktor',
  'Rejstřík',
  'Rejstřík_diskuse',
  'Soubor',
  'Soubor_diskuse',
  'Special',
  'Speciální',
  'TM',
  'Talk',
  'Template',
  'Template_talk',
  'TimedText',
  'TimedText_talk',
  'Téma',
  'User',
  'User_talk',
  'Uživatel',
  'Uživatel_diskuse',
  'Uživatelka_diskuse',
  'WP',
  'WT',
  'Wikipedia',
  'Wikipedia_talk',
  'Wikipedie',
  'Wikipedie_diskuse',
  'Wikipedista',
  'Wikipedista_diskuse',
  'Wikipedistka',
  'Wikipedistka_diskuse',
  'Šab',
  'Šablona',
  'Šablona_diskuse',
]);

/** Tags whose content is dropped entirely — never safe in rendered article HTML. */
const FORBIDDEN_TAGS =
  'script, style, noscript, iframe, object, embed, form, svg, math, link, meta, base, ' +
  'applet, frame, frameset, template, head, title, input, button, textarea, select, ' +
  'option, audio, video, track, portal, dialog';

/** Tags kept in the output. Anything else is unwrapped (its text content survives). */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'hr',
  'div',
  'span',
  'a',
  'b',
  'i',
  'em',
  'strong',
  'u',
  's',
  'del',
  'ins',
  'sub',
  'sup',
  'small',
  'big',
  'mark',
  'abbr',
  'cite',
  'q',
  'blockquote',
  'code',
  'pre',
  'kbd',
  'samp',
  'var',
  'tt',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'caption',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'col',
  'colgroup',
  'img',
  'figure',
  'figcaption',
  'picture',
  'source',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'nav',
  'details',
  'summary',
  'time',
  'data',
  'wbr',
  'bdi',
  'bdo',
  'ruby',
  'rt',
  'rp',
  'address',
]);

const ALLOWED_ATTRS = new Set([
  'class',
  'id',
  'title',
  // RDFa type from Parsoid; inert, but it is the only reliable way for the client
  // to tell a floating thumbnail apart from an inline icon once TemplateStyles are gone.
  'typeof',
  'lang',
  'dir',
  'role',
  'colspan',
  'rowspan',
  'scope',
  'headers',
  'abbr',
  'alt',
  'width',
  'height',
  'loading',
  'decoding',
  'rel',
  'datetime',
  'value',
  'start',
  'reversed',
  'type',
  'span',
]);

const URL_ATTRS = new Set(['href', 'src', 'srcset', 'poster']);

/** Attributes the sanitizer writes itself, and therefore refuses to carry in. */
const RESERVED_ATTRS = ['data-wiki-slug', 'data-wiki-lang', 'data-wiki-skip', 'data-external-href'];
const RESERVED_ATTR_SELECTOR = RESERVED_ATTRS.map((name) => `[${name}]`).join(', ');

/**
 * Sanitize Parsoid HTML for safe rendering, using an allowlist.
 * - drops forbidden tags (script/style/iframe/svg/form/…) and their content
 * - unwraps any tag not on the allowlist, keeping its text
 * - removes every attribute not on the allowlist (including all on* handlers and style)
 * - rewrites internal article links to a defanged, game-aware `#wiki/<lang>/<slug>` form
 * - neutralises red links (missing articles) so a player cannot click into a dead end
 * - strips href from external links, keeps text + data-external-href for debug
 * - normalizes image sources to https and drops unsafe ones
 *
 * Runs in the browser: the article now comes straight from Wikipedia to the
 * player, so this is the only thing standing between a wiki edit and the DOM.
 */
export function sanitizeArticle(html: string, lang: Language): SanitizeResult {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  const titleTag = doc.querySelector('title')?.textContent.trim() ?? '';
  const h1 = doc.querySelector('h1')?.textContent.trim() ?? '';

  // 1) Drop forbidden tags (and their content) outright.
  for (const el of body.querySelectorAll(FORBIDDEN_TAGS)) el.remove();

  // 2) Clear the attributes this function is the sole author of. The scrub in
  // step 5 lets them through unread, so anything arriving under those names has
  // to go before the rewrites below put the real values back. An anchor without
  // an href never reaches the rewrite, and the server stopped cross-checking
  // slugs, so a `data-wiki-slug` smuggled in from a wiki edit would otherwise be
  // a link to anywhere.
  for (const el of body.querySelectorAll(RESERVED_ATTR_SELECTOR)) {
    for (const name of RESERVED_ATTRS) el.removeAttribute(name);
  }

  // 3) Rewrite anchors to a defanged, game-aware form.
  for (const a of body.querySelectorAll('a')) {
    const href = a.getAttribute('href');
    if (href === null) continue;

    if (isInternalArticleLink(href)) {
      const slug = parseSlug(href);
      if (isRedLink(href)) {
        // Points at an article that does not exist — following it would dead-end the player.
        a.removeAttribute('href');
        a.dataset['wikiSkip'] = 'redlink';
        a.setAttribute('rel', 'nofollow');
      } else if (isNamespaceSlug(slug)) {
        a.removeAttribute('href');
        a.dataset['wikiSkip'] = 'namespace';
        a.setAttribute('rel', 'nofollow');
      } else {
        a.setAttribute('href', `#wiki/${lang}/${slug}`);
        a.dataset['wikiSlug'] = slug;
        a.dataset['wikiLang'] = lang;
        a.removeAttribute('target');
        a.setAttribute('rel', 'nofollow');
      }
    } else if (isExternal(href)) {
      a.removeAttribute('href');
      a.dataset['externalHref'] = href;
      a.setAttribute('rel', 'nofollow noopener noreferrer');
    } else {
      a.removeAttribute('href');
    }
  }

  // 4) Normalize images to https; drop unsafe sources.
  for (const img of body.querySelectorAll('img')) {
    const src = normalizeImageUrl(img.getAttribute('src') ?? '');
    if (src === null) img.removeAttribute('src');
    else img.setAttribute('src', src);

    const srcset = img.getAttribute('srcset');
    if (srcset !== null) {
      const safe = srcset
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => {
          const [url, ...descriptor] = part.split(/\s+/);
          const norm = normalizeImageUrl(url ?? '');
          return norm === null ? null : [norm, ...descriptor].join(' ');
        })
        .filter((part): part is string => part !== null);
      if (safe.length > 0) img.setAttribute('srcset', safe.join(', '));
      else img.removeAttribute('srcset');
    }

    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  }

  // 5) Allowlist pass: scrub attributes on every element…
  for (const el of body.querySelectorAll('*')) {
    for (const name of el.getAttributeNames()) {
      const lower = name.toLowerCase();
      if (lower.startsWith('data-wiki-') || lower === 'data-external-href') continue;
      if (lower.startsWith('aria-')) continue;
      if (lower.startsWith('on')) {
        el.removeAttribute(name);
        continue;
      }
      if (URL_ATTRS.has(lower)) {
        if (!isSafeUrlAttr(lower, el.getAttribute(name) ?? '')) el.removeAttribute(name);
        continue;
      }
      if (!ALLOWED_ATTRS.has(lower)) el.removeAttribute(name);
    }
  }

  // …then unwrap any element whose tag is not on the allowlist (its text survives).
  // querySelectorAll is a static list in document order, so a parent is unwrapped
  // before its children and the children stay reachable through their new parent.
  for (const el of body.querySelectorAll('*')) {
    if (ALLOWED_TAGS.has(el.tagName.toLowerCase())) continue;
    if (el.parentNode === null) continue;
    el.replaceWith(...el.childNodes);
  }

  const title = h1 || titleTag || undefined;
  return { html: body.innerHTML, title };
}

export function isInternalArticleLink(href: string): boolean {
  if (href.startsWith('./')) return true;
  if (href.startsWith('/wiki/')) return true;
  return false;
}

/** MediaWiki renders links to missing articles as `?action=edit&redlink=1`. */
export function isRedLink(href: string): boolean {
  const start = href.indexOf('?');
  if (start === -1) return false;
  const query = href.slice(start + 1);
  return query.includes('redlink=1') || query.includes('action=edit');
}

export function isExternal(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
}

export function isNamespaceSlug(slug: string): boolean {
  const colon = slug.indexOf(':');
  if (colon <= 0) return false;
  const prefix = slug.slice(0, colon);
  return NAMESPACE_PREFIXES.has(prefix);
}

/** Returns an https URL, or null if the source cannot be made safe. */
function normalizeImageUrl(url: string): string | null {
  let u = url.trim();
  if (u.length === 0) return null;
  if (u.startsWith('//')) u = `https:${u}`;
  else if (u.startsWith('http://')) u = `https://${u.slice('http://'.length)}`;
  return u.startsWith('https://') ? u : null;
}

function isSafeUrlAttr(attr: string, value: string): boolean {
  const v = value.trim();
  if (attr === 'href') return v.startsWith('#');
  // Only <img> gets its srcset rewritten above, and <picture>/<source> are on
  // the tag allowlist, so this is what stands between a wiki edit and a request
  // to an arbitrary host that hands it every player's IP.
  if (attr === 'srcset') {
    const candidates = v
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0] ?? '')
      .filter((url) => url.length > 0);
    return candidates.length > 0 && candidates.every((url) => url.startsWith('https://'));
  }
  return v.startsWith('https://');
}
