export interface EncryptedPayloadEnvelope {
  payload: string;
}

export const PAYLOAD_ENCRYPTION_HEADER = 'X-Payload-Encryption';
export const PAYLOAD_ENCRYPTION_MARKER = 'v1';

const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const envTransportKey = (import.meta.env.VITE_TRANSPORT_ENCRYPTION_KEY as string | undefined)?.trim() ?? '';
let cachedCryptoKeyPromise: Promise<CryptoKey> | null = null;

function getCryptoApi(): Crypto {
  const api = globalThis.crypto;
  if (!api?.subtle) {
    throw new Error('Web Crypto API is unavailable for encrypted transport payloads.');
  }
  return api;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('No base64 encoder is available in this environment.');
}

function decodeBase64(value: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  throw new Error('No base64 decoder is available in this environment.');
}

function tryDecodeBase64(value: string): Uint8Array | null {
  try {
    return decodeBase64(value);
  } catch {
    return null;
  }
}

function decodeHex(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function resolveTransportKeyBytes(): Uint8Array {
  const keyCandidate = envTransportKey;
  if (!keyCandidate) {
    throw new Error(
      'Missing VITE_TRANSPORT_ENCRYPTION_KEY. Set it to the same 32-byte value as backend APP_ENCRYPTION_KEY.',
    );
  }

  let resolvedBytes: Uint8Array | null = null;

  if (keyCandidate.startsWith('base64:')) {
    resolvedBytes = decodeBase64(keyCandidate.slice(7));
  } else if (/^[0-9a-fA-F]{64}$/.test(keyCandidate)) {
    resolvedBytes = decodeHex(keyCandidate);
  } else if (/^[A-Za-z0-9+/]+=*$/.test(keyCandidate)) {
    const decoded = tryDecodeBase64(keyCandidate);
    if (decoded && decoded.byteLength === 32) {
      resolvedBytes = decoded;
    }
  }

  if (!resolvedBytes) {
    resolvedBytes = textEncoder.encode(keyCandidate);
  }

  if (resolvedBytes.byteLength !== 32) {
    throw new Error(
      'VITE_TRANSPORT_ENCRYPTION_KEY must resolve to exactly 32 bytes (raw, base64, base64:, or 64-char hex).',
    );
  }

  return resolvedBytes;
}

async function getTransportCryptoKey(): Promise<CryptoKey> {
  if (!cachedCryptoKeyPromise) {
    const rawKey = resolveTransportKeyBytes();
    cachedCryptoKeyPromise = getCryptoApi().subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  return cachedCryptoKeyPromise;
}

function parseEnvelope(payload: unknown): EncryptedPayloadEnvelope {
  if (!isRecord(payload)) {
    throw new Error('Encrypted payload envelope must be a JSON object.');
  }

  const opaquePayload = payload.payload;
  if (typeof opaquePayload !== 'string' || opaquePayload.trim() === '') {
    throw new Error('Encrypted payload envelope is missing "payload".');
  }

  return { payload: opaquePayload };
}

function packOpaquePayload(iv: Uint8Array, tag: Uint8Array, cipherText: Uint8Array): string {
  const packed = new Uint8Array(iv.byteLength + tag.byteLength + cipherText.byteLength);
  packed.set(iv, 0);
  packed.set(tag, iv.byteLength);
  packed.set(cipherText, iv.byteLength + tag.byteLength);
  return encodeBase64(packed);
}

function unpackOpaquePayload(payload: string): {
  iv: Uint8Array;
  tag: Uint8Array;
  cipherText: Uint8Array;
} {
  const packed = decodeBase64(payload);
  if (packed.byteLength <= IV_LENGTH_BYTES + TAG_LENGTH_BYTES) {
    throw new Error('Encrypted payload envelope has an invalid payload shape.');
  }

  const iv = packed.slice(0, IV_LENGTH_BYTES);
  const tag = packed.slice(IV_LENGTH_BYTES, IV_LENGTH_BYTES + TAG_LENGTH_BYTES);
  const cipherText = packed.slice(IV_LENGTH_BYTES + TAG_LENGTH_BYTES);
  return { iv, tag, cipherText };
}

export async function encryptTransportPayload(payload: unknown): Promise<EncryptedPayloadEnvelope> {
  const jsonPayload = JSON.stringify(payload);
  if (typeof jsonPayload !== 'string') {
    throw new Error('Request payload could not be serialized into JSON.');
  }

  const cryptoApi = getCryptoApi();
  const key = await getTransportCryptoKey();
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const plainBytes = textEncoder.encode(jsonPayload);

  const encrypted = new Uint8Array(
    await cryptoApi.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: TAG_LENGTH_BYTES * 8 },
      key,
      plainBytes,
    ),
  );

  if (encrypted.byteLength <= TAG_LENGTH_BYTES) {
    throw new Error('Encrypted transport payload returned an invalid payload.');
  }

  const cipherText = encrypted.slice(0, encrypted.byteLength - TAG_LENGTH_BYTES);
  const tag = encrypted.slice(encrypted.byteLength - TAG_LENGTH_BYTES);

  return {
    payload: packOpaquePayload(iv, tag, cipherText),
  };
}

export async function decryptTransportPayload<T = unknown>(payload: unknown): Promise<T> {
  const envelope = parseEnvelope(payload);
  const { iv, tag, cipherText } = unpackOpaquePayload(envelope.payload);

  const encrypted = new Uint8Array(cipherText.byteLength + tag.byteLength);
  encrypted.set(cipherText, 0);
  encrypted.set(tag, cipherText.byteLength);

  const key = await getTransportCryptoKey();
  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await getCryptoApi().subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: TAG_LENGTH_BYTES * 8 },
      key,
      encrypted,
    );
  } catch {
    throw new Error('Encrypted payload could not be decrypted.');
  }

  const json = textDecoder.decode(new Uint8Array(decryptedBuffer));
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error('Decrypted payload is not valid JSON.');
  }
}
