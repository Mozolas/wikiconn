import { z } from 'zod';

export {
  type WikiRandomResponse,
  type WikiSearchResult,
  wikiSearchResultSchema,
} from '@wikiconn/shared';

export const wikiSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export type WikiSearchQuery = z.infer<typeof wikiSearchQuerySchema>;
