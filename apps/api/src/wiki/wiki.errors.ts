import { HttpException, HttpStatus } from '@nestjs/common';

export class WikiFetchError extends HttpException {
  constructor(reason: string) {
    super(
      { code: 'WIKI_FETCH_FAILED', message: `Failed to fetch from Wikipedia: ${reason}` },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
