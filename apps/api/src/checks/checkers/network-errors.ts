const KNOWN_CODES: Record<string, string> = {
  ENOTFOUND: 'Домен не найден (DNS)',
  EAI_AGAIN: 'DNS не ответил вовремя',
  ECONNREFUSED: 'Соединение отклонено',
  ECONNRESET: 'Соединение сброшено сервером',
  ETIMEDOUT: 'Не удалось подключиться вовремя',
  EHOSTUNREACH: 'Хост недоступен',
  ENETUNREACH: 'Сеть недоступна',
  CERT_HAS_EXPIRED: 'SSL-сертификат истёк',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'Самоподписанный SSL-сертификат',
  SELF_SIGNED_CERT_IN_CHAIN: 'Самоподписанный сертификат в цепочке',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Не удалось проверить SSL-сертификат',
  ERR_TLS_CERT_ALTNAME_INVALID: 'SSL-сертификат выдан для другого домена',
  UND_ERR_CONNECT_TIMEOUT: 'Не удалось подключиться вовремя',
  UND_ERR_HEADERS_TIMEOUT: 'Сервер не ответил вовремя',
  UND_ERR_SOCKET: 'Соединение неожиданно закрылось',
};

interface ErrorLike {
  name?: string;
  code?: string;
  message?: string;
  cause?: unknown;
}

const asErrorLike = (value: unknown): ErrorLike =>
  typeof value === 'object' && value !== null ? (value as ErrorLike) : {};

export function describeNetworkError(error: unknown, timeoutMs: number): string {
  let current = asErrorLike(error);

  for (let depth = 0; depth < 4; depth++) {
    if (current.name === 'TimeoutError') return `Нет ответа за ${timeoutMs} мс`;
    if (current.code && KNOWN_CODES[current.code]) return KNOWN_CODES[current.code] as string;
    // fetch() refuses ports from the Fetch spec blocklist (1, 25, 6000, 10080...)
    if (current.message === 'bad port')
      return 'Этот порт запрещён для HTTP-проверок, используйте TCP-монитор';
    if (!current.cause) break;
    current = asErrorLike(current.cause);
  }

  if (current.name === 'AbortError') return 'Проверка отменена';
  return current.code ?? current.message ?? 'Неизвестная сетевая ошибка';
}
