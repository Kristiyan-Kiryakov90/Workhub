import { API_URL } from '@/config/env';

type ApiErrorBody = {
  error?: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function postJson<TResponse>(
  path: string,
  body: unknown,
  token?: string | null,
) {
  return requestJson<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function getJson<TResponse>(path: string, token?: string | null) {
  return requestJson<TResponse>(path, {
    method: 'GET',
    token,
  });
}

export async function requestJson<TResponse>(
  path: string,
  options: {
    method: 'GET' | 'POST';
    body?: string;
    token?: string | null;
  },
) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
  });

  const data = (await response.json().catch(() => null)) as ApiErrorBody | TResponse | null;

  if (!response.ok) {
    const message = getErrorMessage(data);
    throw new ApiError(response.status, message);
  }

  return data as TResponse;
}

export function withQuery(path: string, query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const serialized = params.toString();

  return serialized ? `${path}?${serialized}` : path;
}

function getErrorMessage(data: unknown) {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof data.error === 'string'
  ) {
    return data.error;
  }

  return 'The request failed. Please try again.';
}
