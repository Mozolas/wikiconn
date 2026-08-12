import 'reflect-metadata';

import { Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { CorsIoAdapter } from './common/cors-io.adapter.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AppConfig } from './config/app-config.service.js';

import type { AppEnv } from './config/env.schema.js';
import type { NestExpressApplication } from '@nestjs/platform-express';

const LOG_LEVELS: Record<AppEnv['LOG_LEVEL'], LogLevel[]> = {
  error: ['error'],
  warn: ['error', 'warn'],
  log: ['error', 'warn', 'log'],
  debug: ['error', 'warn', 'log', 'debug'],
  verbose: ['error', 'warn', 'log', 'debug', 'verbose'],
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const config = app.get(AppConfig);
  app.useLogger(LOG_LEVELS[config.logLevel]);

  app.use(helmet());
  app.useBodyParser('json', { limit: '32kb' });

  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app, config.corsOrigin));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(config.port);

  new Logger('Bootstrap').log(`wikiconn-api listening on http://localhost:${String(config.port)}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
