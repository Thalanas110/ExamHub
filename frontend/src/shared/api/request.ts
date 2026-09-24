import { PHP_BASE_URL } from './base-url';
import { getAuthHeaders } from './auth-headers';
import { createRequestError } from './errors';

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const headers = getAuthHeaders(auth);

  const response = await fetch(`${PHP_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (payload === null) {
    throw new Error('JSON response body is missing.');
  }

  if (!response.ok) {
    throw createRequestError(payload, response);
  }

  return payload as T;
}
