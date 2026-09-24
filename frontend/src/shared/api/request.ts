import { PHP_BASE_URL } from './base-url';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('examhub_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

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
    const errorPayload = isRecord(payload) ? payload : {};
    const error = errorPayload.error;
    const message = errorPayload.message;
    throw new Error(
      (typeof error === 'string' && error) ||
        (typeof message === 'string' && message) ||
        response.statusText ||
        `HTTP ${response.status}`,
    );
  }

  return payload as T;
}
