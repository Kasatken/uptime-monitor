import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';
import { AppConfig } from '../config/app-config.js';

export const SESSION_COOKIE = 'vigil_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

const digest = (value: string) => createHash('sha256').update(value).digest();

@Injectable()
export class AuthService {
  constructor(
    private readonly config: AppConfig,
    private readonly jwt: JwtService,
  ) {}

  async login(password: string): Promise<string> {
    // Compare digests so timingSafeEqual gets equal-length buffers and leaks nothing
    const valid = timingSafeEqual(digest(password), digest(this.config.adminPassword));
    if (!valid) throw new UnauthorizedException('Неверный пароль');
    return this.jwt.signAsync({ sub: 'owner' }, { expiresIn: SESSION_TTL_SECONDS });
  }

  isValidSession(token: string | undefined): boolean {
    if (!token) return false;
    try {
      this.jwt.verify(token);
      return true;
    } catch {
      return false;
    }
  }

  isValidCookieHeader(header: string | undefined): boolean {
    if (!header) return false;
    return this.isValidSession(parseCookie(header)[SESSION_COOKIE]);
  }
}
