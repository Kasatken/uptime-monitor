import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  // behind nginx/caddy in production: needed for correct client IPs in the rate limiter
  app.set('trust proxy', 'loopback');
  app.enableShutdownHooks();

  await app.listen(config.port);
  Logger.log(`API listening on http://localhost:${config.port}/api`, 'Bootstrap');
}

void bootstrap();
