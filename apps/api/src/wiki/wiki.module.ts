import { Module } from '@nestjs/common';

import { WikiController } from './wiki.controller.js';
import { WikiSanitizer } from './wiki.sanitizer.js';
import { WikiService } from './wiki.service.js';

@Module({
  controllers: [WikiController],
  providers: [WikiService, WikiSanitizer],
  exports: [WikiService],
})
export class WikiModule {}
