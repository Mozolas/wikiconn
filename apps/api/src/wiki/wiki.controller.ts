import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type Language, languageSchema, slugSchema } from '@wikiconn/shared';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { WikiService } from './wiki.service.js';
import { wikiSearchQuerySchema, type WikiSearchQuery } from './wiki.types.js';

@Controller('wiki')
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  @Get(':lang/search')
  async search(
    @Param('lang', new ZodValidationPipe(languageSchema)) lang: Language,
    @Query(new ZodValidationPipe(wikiSearchQuerySchema)) query: WikiSearchQuery,
  ) {
    const results = await this.wiki.search(lang, query.q, query.limit ?? 10);
    return { lang, query: query.q, results };
  }

  /** Uncached by definition, so it gets a tighter budget than the rest of the API. */
  @Get(':lang/random')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async random(@Param('lang', new ZodValidationPipe(languageSchema)) lang: Language) {
    return this.wiki.random(lang);
  }

  @Get(':lang/:slug')
  @UsePipes()
  async getArticle(
    @Param('lang', new ZodValidationPipe(languageSchema)) lang: Language,
    @Param('slug', new ZodValidationPipe(slugSchema)) slug: string,
  ) {
    return this.wiki.getArticle(lang, slug);
  }
}
