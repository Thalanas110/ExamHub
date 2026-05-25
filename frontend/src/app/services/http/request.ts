import { PHP_BASE_URL } from './base-url';
import {
  decryptTransportPayload,
  encryptTransportPayload,
  PAYLOAD_ENCRYPTION_HEADER,
  PAYLOAD_ENCRYPTION_MARKER,
} from './transport-crypto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [PAYLOAD_ENCRYPTION_HEADER]: PAYLOAD_ENCRYPTION_MARKER,
  };

  if (auth) {
    const token = localStorage.getItem('examhub_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const encryptedBody = body !== undefined ? await encryptTransportPayload(body) : undefined;

  const response = await fetch(`${PHP_BASE_URL}${path}`, {
    method,
    headers,
    body: encryptedBody !== undefined ? JSON.stringify(encryptedBody) : undefined,
  });

  const encryptionHeader = response.headers.get(PAYLOAD_ENCRYPTION_HEADER);
  if ((encryptionHeader ?? '') !== PAYLOAD_ENCRYPTION_MARKER) {
    throw new Error(
      `Expected encrypted response header ${PAYLOAD_ENCRYPTION_HEADER}: ${PAYLOAD_ENCRYPTION_MARKER}.`,
    );
  }

  const envelope = await response.json().catch(() => null);
  if (envelope === null) {
    throw new Error('Encrypted response body is missing.');
  }

  const payload = await decryptTransportPayload<unknown>(envelope);

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
