import { languageSchema, slugSchema } from '@wikiconn/shared';
import { z } from 'zod';

export {
  type WikiArticleResponse,
  type WikiRandomResponse,
  type WikiSearchResponse,
  type WikiSearchResult,
  wikiArticleResponseSchema,
  wikiRandomResponseSchema,
  wikiSearchResponseSchema,
  wikiSearchResultSchema,
} from '@wikiconn/shared';

export const wikiSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export type WikiSearchQuery = z.infer<typeof wikiSearchQuerySchema>;

export const wikiArticleParamsSchema = z.object({
  lang: languageSchema,
  slug: slugSchema,
});

export type WikiArticleParams = z.infer<typeof wikiArticleParamsSchema>;

export const wikiSearchParamsSchema = z.object({
  lang: languageSchema,
});

export type WikiSearchParams = z.infer<typeof wikiSearchParamsSchema>;
