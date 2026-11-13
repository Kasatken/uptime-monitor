import { isIP } from 'node:net';
import tls from 'node:tls';
import { Injectable } from '@nestjs/common';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 5_000;

/**
 * fetch() doesn't expose the peer certificate, so we open a separate TLS
 * connection to read its expiry date. Certificates change rarely, so the
 * result is cached for a few hours instead of probing on every check.
 */
@Injectable()
export class TlsCertificateProbe {
  private readonly cache = new Map<string, { expiresAt: Date | null; fetchedAt: number }>();

  async expiryFor(rawUrl: string): Promise<Date | null> {
    const url = new URL(rawUrl);
    const port = Number(url.port) || 443;
    const key = `${url.hostname}:${port}`;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.expiresAt;

    const expiresAt = await this.readExpiry(url.hostname, port).catch(() => null);
    this.cache.set(key, { expiresAt, fetchedAt: Date.now() });
    return expiresAt;
  }

  private readExpiry(host: string, port: number): Promise<Date | null> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host,
          port,
          // SNI must not be an IP address
          servername: isIP(host) ? undefined : host,
          // We only want to read the certificate; validity is judged by the HTTP check itself
          rejectUnauthorized: false,
          timeout: CONNECT_TIMEOUT_MS,
        },
        () => {
          const certificate = socket.getPeerCertificate();
          socket.end();
          resolve(certificate?.valid_to ? new Date(certificate.valid_to) : null);
        },
      );

      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('TLS handshake timed out'));
      });
      socket.once('error', reject);
    });
  }
}
