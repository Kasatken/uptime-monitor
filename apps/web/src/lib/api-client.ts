export interface ValidationIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
}

export async function api<T>(
  path: string,
  { json, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(json !== undefined && { 'content-type': 'application/json' }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      response.status === 429
        ? 'Слишком много попыток, подождите минуту'
        : (body?.message ?? response.statusText);
    throw new ApiError(response.status, message, body?.issues ?? []);
  }
  return body as T;
}

export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;
