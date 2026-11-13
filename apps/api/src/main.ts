import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.js';

const DEFAULT_WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          // React sets inline style attributes and toasts inject a <style> tag
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'", config.appOrigin.replace(/^http/, 'ws')],
        },
      },
    }),
  );
  app.use(cookieParser());
  app.useWebSocketAdapter(new WsAdapter(app));
  // needed for correct client IPs in the rate limiter behind nginx/caddy
  app.set('trust proxy', 'loopback');
  app.enableShutdownHooks();

  serveWebApp(app, config.webDistDir ?? DEFAULT_WEB_DIST);

  await app.listen(config.port);
  Logger.log(`Listening on http://localhost:${config.port}`, 'Bootstrap');
}

// In production one process serves both the API and the built React app.
function serveWebApp(app: NestExpressApplication, dir: string) {
  const index = join(dir, 'index.html');
  if (!existsSync(index)) return;

  app.useStaticAssets(join(dir, 'assets'), { prefix: '/assets', maxAge: '1y', immutable: true });
  app.useStaticAssets(dir, { index: false });
  // Client-side routes (/admin/monitors/…) get index.html; /api stays with Nest
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(index);
  });
  Logger.log(`Serving the web app from ${dir}`, 'Bootstrap');
}

void bootstrap();
