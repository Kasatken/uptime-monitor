const KNOWN_CODES: Record<string, string> = {
  ENOTFOUND: 'DNS lookup failed',
  EAI_AGAIN: 'DNS lookup timed out',
  ECONNREFUSED: 'Connection refused',
  ECONNRESET: 'Connection reset by peer',
  ETIMEDOUT: 'Connection timed out',
  EHOSTUNREACH: 'Host unreachable',
  ENETUNREACH: 'Network unreachable',
  CERT_HAS_EXPIRED: 'SSL certificate has expired',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'Self-signed SSL certificate',
  SELF_SIGNED_CERT_IN_CHAIN: 'Self-signed certificate in chain',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Unable to verify SSL certificate',
  ERR_TLS_CERT_ALTNAME_INVALID: 'SSL certificate does not match host name',
  UND_ERR_CONNECT_TIMEOUT: 'Connection timed out',
  UND_ERR_HEADERS_TIMEOUT: 'Server did not send headers in time',
  UND_ERR_SOCKET: 'Socket closed unexpectedly',
};

interface ErrorLike {
  name?: string;
  code?: string;
  message?: string;
  cause?: unknown;
}

const asErrorLike = (value: unknown): ErrorLike =>
  typeof value === 'object' && value !== null ? (value as ErrorLike) : {};

/**
 * fetch() and net.Socket fail with deeply nested, inconsistent errors
 * ("fetch failed" → cause → code). Turn them into one readable line.
 */
export function describeNetworkError(error: unknown, timeoutMs: number): string {
  let current = asErrorLike(error);

  // Walk down the `cause` chain until we find something meaningful
  for (let depth = 0; depth < 4; depth++) {
    if (current.name === 'TimeoutError') return `Timed out after ${timeoutMs} ms`;
    if (current.code && KNOWN_CODES[current.code]) return KNOWN_CODES[current.code] as string;
    // fetch() refuses ports from the Fetch spec blocklist (1, 25, 6000, 10080...)
    if (current.message === 'bad port') return 'Port is blocked for HTTP checks, use a TCP monitor';
    if (!current.cause) break;
    current = asErrorLike(current.cause);
  }

  if (current.name === 'AbortError') return 'Check was cancelled';
  return current.code ?? current.message ?? 'Unknown network error';
}
