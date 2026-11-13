import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AppConfig } from '../config/app-config.js';
import { AuthService, SESSION_COOKIE, SESSION_TTL_SECONDS } from './auth.service.js';
import { Public } from './public.decorator.js';

const loginSchema = z.object({ password: z.string().min(1, 'Введите пароль') });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(204)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.output<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.auth.login(body.password);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.isProduction,
      maxAge: SESSION_TTL_SECONDS * 1000,
      path: '/',
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('session')
  session() {
    return { authenticated: true };
  }
}
