import { absoluteUrl } from '@/lib/site';

import type { MetadataRoute } from 'next';

/**
 * Crawlers that answer questions rather than rank pages. Listing them changes
 * nothing mechanically — an absent rule already means "allowed" — but two of
 * them (Google-Extended, Applebot-Extended) are opt-out only, so spelling the
 * decision out here is the difference between "we allow this" and "nobody ever
 * thought about it".
 */
const ANSWER_ENGINE_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
];

// Nothing is disallowed, deliberately. Rooms are throwaway and must stay out of
// the index, but they carry noindex to say so, and a crawler that is not allowed
// to fetch a page never reads the noindex on it. Blocking here would leave a
// leaked invite eligible to be listed as a bare URL; letting it be fetched
// guarantees it is dropped instead. The pages are unlinked, code-guarded and
// cheap to render, so there is no crawl budget worth defending.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: ANSWER_ENGINE_AGENTS, allow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
