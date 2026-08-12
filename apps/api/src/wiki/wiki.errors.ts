import { HttpException, HttpStatus } from '@nestjs/common';

export class WikiArticleNotFoundError extends HttpException {
  constructor(lang: string, slug: string) {
    super(
      { code: 'WIKI_ARTICLE_NOT_FOUND', message: `Article '${slug}' not found on ${lang}.wiki` },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class WikiFetchError extends HttpException {
  constructor(reason: string) {
    super(
      { code: 'WIKI_FETCH_FAILED', message: `Failed to fetch from Wikipedia: ${reason}` },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
