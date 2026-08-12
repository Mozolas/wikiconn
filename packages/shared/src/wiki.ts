import { z } from 'zod';

import { languageSchema } from './language.js';
import { slugSchema } from './player.js';

export const wikiSearchResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.url(),
  slug: slugSchema,
});

export type WikiSearchResult = z.infer<typeof wikiSearchResultSchema>;

export const wikiSearchResponseSchema = z.object({
  lang: languageSchema,
  query: z.string(),
  results: z.array(wikiSearchResultSchema),
});

export type WikiSearchResponse = z.infer<typeof wikiSearchResponseSchema>;

export const wikiRandomResponseSchema = z.object({
  lang: languageSchema,
  title: z.string(),
  slug: slugSchema,
  description: z.string(),
});

export type WikiRandomResponse = z.infer<typeof wikiRandomResponseSchema>;

export const wikiArticleResponseSchema = z.object({
  lang: languageSchema,
  slug: slugSchema,
  title: z.string(),
  html: z.string(),
  cached: z.boolean(),
});

export type WikiArticleResponse = z.infer<typeof wikiArticleResponseSchema>;
