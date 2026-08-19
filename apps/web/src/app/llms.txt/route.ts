import { localePath } from '@/i18n/config';
import { absoluteUrl, site } from '@/lib/site';

// Prerendered at build time: the file is a constant, and serving it from the
// static output keeps it out of the request path entirely.
export const dynamic = 'force-static';

/**
 * https://llmstxt.org — a plain-language brief for models that read the site
 * instead of ranking it. The structure is load-bearing: an H1, a blockquote
 * summary, prose, then H2 sections of annotated links.
 */
const LLMS_TXT = `# ${site.name}

> A free multiplayer browser game in which two to five players race from one
> Wikipedia article to another, clicking only the links inside the articles
> themselves. No search box, no address bar, no accounts.

The host opens a room, picks a Wikipedia language, a starting article and a
target article, then shares a six-character code. Everyone loads the same
starting article at the same moment. A move is legal only if the link was
actually present on the article the player was standing on, which the server
verifies before broadcasting it. The first player to reach the target ends the
race for everyone, and the result screen reveals every player's full route,
click count and time regardless of what they could see during the race.

The host also decides how much rivals reveal about each other mid-race: current
article, click count and full path are three independent switches.

Articles are fetched live from Wikipedia, stripped of scripts and external
links, and rendered in a copy of the Vector 2022 skin. English and Czech
Wikipedia are supported, and the interface itself is available in both
languages.

## Pages

- [${site.name}](${absoluteUrl(localePath('en', '/'))}): English. What the game is, how a race works, and the forms for creating or joining a room.
- [${site.name} — česky](${absoluteUrl(localePath('cs', '/'))}): the same page in Czech.

## Notes

- Rooms live at /room/{code} in English and /cs/room/{code} in Czech. They are ephemeral, expire after 24 hours of silence, and are excluded from crawling and indexing.
- The game is free, requires no account and no download, and runs in any modern browser including mobile.
- Article text and images come from Wikipedia under CC BY-SA 4.0. ${site.name} is an independent hobby project, not affiliated with or endorsed by the Wikimedia Foundation.
- Source code: ${site.repository}
`;

export function GET(): Response {
  return new Response(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
