import { Injectable } from '@nestjs/common';
import { type Language, parseSlug } from '@wikiconn/shared';
import * as cheerio from 'cheerio';

export interface SanitizeResult {
  html: string;
  title: string | undefined;
}

const NAMESPACE_PREFIXES = new Set([
  'Special',
  'File',
  'Image',
  'Category',
  'Template',
  'Help',
  'Portal',
  'Project',
  'Wikipedia',
  'User',
  'Talk',
  'Soubor',
  'Kategorie',
  'Šablona',
  'Nápověda',
  'Portál',
  'Wikipedie',
  'Uživatel',
  'Diskuse',
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

/** Attributes kept on any element. URL-bearing attributes are validated separately. */
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

@Injectable()
export class WikiSanitizer {
  /**
   * Sanitize Parsoid HTML for safe rendering in the browser using an allowlist.
   * - drops forbidden tags (script/style/iframe/svg/form/…) and their content
   * - unwraps any tag not on the allowlist, keeping its text
   * - removes every attribute not on the allowlist (including all on* handlers and style)
   * - rewrites internal article links to a defanged, game-aware `#wiki/<lang>/<slug>` form
   * - neutralises red links (missing articles) so a player cannot click into a dead end
   * - strips href from external links, keeps text + data-external-href for debug
   * - normalizes image sources to https and drops unsafe ones
   */
  sanitize(html: string, lang: Language): SanitizeResult {
    const $ = cheerio.load(html, null, false);

    const titleTag = $('title').first().text().trim();
    const h1 = $('h1').first().text().trim();

    // 1) Drop forbidden tags (and their content) outright.
    $(FORBIDDEN_TAGS).remove();

    // 2) Rewrite anchors to a defanged, game-aware form.
    $('a').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href');
      if (href === undefined) return;

      if (this.isInternalArticleLink(href)) {
        const slug = parseSlug(href);
        if (this.isRedLink(href)) {
          // Points at an article that does not exist — following it would dead-end the player.
          $a.removeAttr('href');
          $a.attr('data-wiki-skip', 'redlink');
          $a.attr('rel', 'nofollow');
        } else if (this.isNamespaceSlug(slug)) {
          $a.removeAttr('href');
          $a.attr('data-wiki-skip', 'namespace');
          $a.attr('rel', 'nofollow');
        } else {
          $a.attr('href', `#wiki/${lang}/${slug}`);
          $a.attr('data-wiki-slug', slug);
          $a.attr('data-wiki-lang', lang);
          $a.removeAttr('target');
          $a.attr('rel', 'nofollow');
        }
      } else if (this.isExternal(href)) {
        $a.removeAttr('href');
        $a.attr('data-external-href', href);
        $a.attr('rel', 'nofollow noopener noreferrer');
      } else {
        $a.removeAttr('href');
      }
    });

    // 3) Normalize images to https; drop unsafe sources.
    $('img').each((_, el) => {
      const $img = $(el);
      const src = this.normalizeImageUrl($img.attr('src') ?? '');
      if (src === null) $img.removeAttr('src');
      else $img.attr('src', src);

      const srcset = $img.attr('srcset');
      if (srcset !== undefined) {
        const safe = srcset
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .map((part) => {
            const [url, ...descriptor] = part.split(/\s+/);
            const norm = this.normalizeImageUrl(url ?? '');
            return norm === null ? null : [norm, ...descriptor].join(' ');
          })
          .filter((part): part is string => part !== null);
        if (safe.length > 0) $img.attr('srcset', safe.join(', '));
        else $img.removeAttr('srcset');
      }

      $img.attr('loading', 'lazy');
      $img.attr('decoding', 'async');
    });

    // 4) Allowlist pass: scrub attributes on every element…
    $('*').each((_, el) => {
      const $el = $(el);
      const attribs = $el.attr();
      if (attribs === undefined) return;
      for (const name of Object.keys(attribs)) {
        const lower = name.toLowerCase();
        if (lower.startsWith('data-wiki-') || lower === 'data-external-href') continue;
        if (lower.startsWith('aria-')) continue;
        if (lower.startsWith('on')) {
          $el.removeAttr(name);
          continue;
        }
        if (URL_ATTRS.has(lower)) {
          if (!this.isSafeUrlAttr(lower, attribs[name] ?? '')) $el.removeAttr(name);
          continue;
        }
        if (!ALLOWED_ATTRS.has(lower)) $el.removeAttr(name);
      }
    });

    // …then unwrap any element whose tag is not on the allowlist (its text survives).
    $('*')
      .not([...ALLOWED_TAGS].join(','))
      .each((_, el) => {
        const $el = $(el);
        $el.replaceWith($el.contents());
      });

    const title = h1 || titleTag || undefined;
    return { html: $.html(), title };
  }

  isInternalArticleLink(href: string): boolean {
    if (href.startsWith('./')) return true;
    if (href.startsWith('/wiki/')) return true;
    return false;
  }

  /** MediaWiki renders links to missing articles as `?action=edit&redlink=1`. */
  isRedLink(href: string): boolean {
    const start = href.indexOf('?');
    if (start === -1) return false;
    const query = href.slice(start + 1);
    return query.includes('redlink=1') || query.includes('action=edit');
  }

  isExternal(href: string): boolean {
    return href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
  }

  isNamespaceSlug(slug: string): boolean {
    const colon = slug.indexOf(':');
    if (colon <= 0) return false;
    const prefix = slug.slice(0, colon);
    return NAMESPACE_PREFIXES.has(prefix);
  }

  /** Returns an https URL, or null if the source cannot be made safe. */
  private normalizeImageUrl(url: string): string | null {
    let u = url.trim();
    if (u.length === 0) return null;
    if (u.startsWith('//')) u = `https:${u}`;
    else if (u.startsWith('http://')) u = `https://${u.slice('http://'.length)}`;
    return u.startsWith('https://') ? u : null;
  }

  private isSafeUrlAttr(attr: string, value: string): boolean {
    const v = value.trim();
    if (attr === 'href') return v.startsWith('#');
    if (attr === 'srcset') return v.length > 0;
    return v.startsWith('https://');
  }
}
