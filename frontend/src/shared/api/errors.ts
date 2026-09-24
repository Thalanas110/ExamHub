export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createRequestError(payload: unknown, response: Response): Error {
  const errorPayload = isRecord(payload) ? payload : {};
  const error = errorPayload.error;
  const message = errorPayload.message;

  return new Error(
    (typeof error === 'string' && error) ||
      (typeof message === 'string' && message) ||
      response.statusText ||
      `HTTP ${response.status}`,
  );
}
