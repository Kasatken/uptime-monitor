import { describe, expect, it } from 'vitest';
import { describeNetworkError } from './network-errors.js';

describe('describeNetworkError', () => {
  it('unwraps the cause chain of fetch errors', () => {
    const error = new TypeError('fetch failed', {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND nope.invalid'), { code: 'ENOTFOUND' }),
    });
    expect(describeNetworkError(error, 5000)).toBe('Домен не найден (DNS)');
  });

  it('reports timeouts with the configured limit', () => {
    const error = new DOMException('The operation timed out', 'TimeoutError');
    expect(describeNetworkError(error, 3000)).toBe('Нет ответа за 3000 мс');
  });

  it('finds a timeout wrapped into an AbortError (net.Socket)', () => {
    const error = Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
      cause: new DOMException('timed out', 'TimeoutError'),
    });
    expect(describeNetworkError(error, 1000)).toBe('Нет ответа за 1000 мс');
  });

  it('falls back to the raw code or message', () => {
    expect(describeNetworkError(Object.assign(new Error('x'), { code: 'EWEIRD' }), 1)).toBe(
      'EWEIRD',
    );
    expect(describeNetworkError('nonsense', 1)).toBe('Неизвестная сетевая ошибка');
  });
});
