import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { EnvVars } from './config/env.validation.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production', prefix: 'SretenjskiBalAPI' }),
  });
  const config = app.get(ConfigService<EnvVars, true>);

  app.set('trust proxy', 1); // iza Angular SSR servera — da rate limit vidi pravu IP adresu
  app.use(helmet());
  app.useBodyParser('json', { limit: '50kb' });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }).split(',').map((o) => o.trim()),
    methods: ['GET', 'POST'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
