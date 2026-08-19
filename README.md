# WikiConn

Multiplayer Wikipedia race. Everyone starts on the same article and clicks
links to reach a target one. First to arrive wins. Two to five players per
room, no accounts.

Articles are fetched from Wikipedia, sanitized on the server and rendered in a
copy of the Vector 2022 skin, so the page you race through looks like the real
thing. Without the search box, obviously.

![Racing through Albert Einstein towards Pizza: contents rail on the left, target and timer in the header, rivals on the right](docs/race.png)

![The lobby: the host picks the route and how much racers see about each other](docs/lobby.png)

## Running it

Needs Node 24, pnpm 10 and Docker.

```bash
pnpm install
docker compose up -d                          # Dragonfly on :6380
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev                                      # web :3000, api :3001
```

Then open <http://localhost:3000>, create a room and open the invite link in a
second browser. Dragonfly is published on 6380 instead of 6379 so it does not
collide with a Redis you already have running.

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | both apps in watch mode |
| `pnpm build` | production builds |
| `pnpm test` | Vitest across every workspace |
| `pnpm check` | typecheck, lint, format check (the CI gate) |

## Layout

```
apps/api          NestJS: Wikipedia proxy, Socket.IO gateway, game rules
apps/web          Next.js App Router client
packages/shared   Zod schemas and the socket contract both ends compile against
```

State lives in Dragonfly: a hash per room, a hash of its players, and cached
article HTML. Rooms expire after 24 hours of silence.

## Languages

The interface comes in English and Czech. English is served from the root and
Czech from `/cs`, so the URLs that were already shared as invites keep working:
the routes live under `app/[lang]` and a rewrite maps the unprefixed paths onto
the English tree.

Every string lives in `apps/web/src/i18n/dictionaries`. The English one is also
the type the others have to satisfy, so a missing key fails `pnpm check` rather
than showing up as an English word mid-sentence. Server components read the
dictionary directly; client components take it from a context whose value the
layout supplies, which keeps the translations the visitor is not reading out of
the browser bundle.

Wikipedia's own furniture inside the article — the tagline under the title, the
contents rail — follows the *article's* language instead, from
`apps/web/src/lib/wikipedia-chrome.ts`. Someone reading English Wikipedia should
see the English page whatever the interface is set to.

## How a race works

The host picks a language, a start and a finish article, and how much players
see about each other while racing. On start, every client loads the start
article from `GET /wiki/:lang/:slug`. That HTML arrives with scripts, inline
handlers and external links stripped, and with internal links rewritten to
carry `data-wiki-slug`.

The client intercepts clicks on those links and emits `player:navigate`. The
server checks the target really is a link on the article the player is standing
on, records the move and broadcasts it, filtered by the host's visibility
settings. Reaching the finish ends the race for everyone, and the result screen
always reveals every player's full route regardless of those settings.

## Socket events

Defined and Zod-validated in `packages/shared/src/events.ts`. Every payload is
parsed on receipt, in both directions.

Client to server: `room:join`, `room:leave`, `room:update-settings`,
`room:start-game`, `player:navigate`, `game:reset`.

Server to client: `room:state`, `room:player-joined`, `room:player-left`,
`room:settings-updated`, `game:started`, `game:player-moved`, `game:won`,
`error`.

## Crawlers

`/robots.txt`, `/sitemap.xml` and `/llms.txt` are generated from the route tree,
the last of those being a plain-language brief for models that read the site to
answer a question rather than to rank it.

Rooms stay out of the index by carrying `noindex`, not by being disallowed in
`robots.txt`. The two look interchangeable and are not: a crawler that is not
allowed to fetch a page never reads the `noindex` on it, so blocking would leave
a leaked invite eligible to be listed as a bare URL. Letting it be fetched is
what guarantees it gets dropped.

The home page also emits a schema.org graph — the site, the game, its player
count and the FAQ — built from the same array the page renders, so the answers a
crawler reads are the ones on the page.

## Configuration

Both apps read their settings from env files; see `apps/api/.env.example` and
`apps/web/.env.example` for the full list and defaults.

`NEXT_PUBLIC_SITE_URL` is the one to get right when deploying somewhere else:
canonical URLs, the sitemap and the social card are resolved against it, and
like the other `NEXT_PUBLIC_*` values it is baked in at build time.

## Deploying

Every merge to `main` runs the checks, builds both images, pushes them to GHCR
and rolls the stack on the server over SSH. That is all of
`.github/workflows/deploy.yml`; the server needs nothing but Docker.

Caddy terminates TLS and keeps everything on one origin: `/socket.io/*` and
`/api/*` go to the API, the rest to Next. Since `NEXT_PUBLIC_*` is baked into
the client bundle at build time, changing the domain means rebuilding the web
image rather than editing an env file — the workflow passes it as a build arg.

Repository secrets:

| Secret | What |
| --- | --- |
| `DEPLOY_HOST` | server hostname or IP |
| `DEPLOY_USER` | SSH user on that host |
| `DEPLOY_SSH_KEY` | private key for that user |
| `DEPLOY_KNOWN_HOSTS` | optional; pins the host key instead of trusting it on first connection |

Set the repository variable `WIKICONN_DOMAIN` to deploy somewhere other than
`wikiconn.mozola.net`.

## Licence

MIT, see [LICENSE](LICENSE).

Article text and images come from Wikipedia and remain under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); none of it is
redistributed in this repository. The design imitates the Vector 2022 skin, but
the name and logo belong to this project. WikiConn is not affiliated with the
Wikimedia Foundation.
