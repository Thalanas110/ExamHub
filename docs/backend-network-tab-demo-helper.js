(() => {
  const HEADER_NAME = 'X-Payload-Encryption';
  const HEADER_VALUE = 'v1';
  const IV_LENGTH_BYTES = 12;
  const TAG_LENGTH_BYTES = 16;
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  const state = {
    apiBase: '',
    keyCandidate: '',
    cryptoKeyPromise: null,
    wrapped: false,
    lastUserId: null,
    lastExamId: null,
    lastSubmissionId: null,
    lastExchange: null,
  };

  function encodeBase64(bytes) {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  function decodeBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function tryDecodeBase64(value) {
    try {
      return decodeBase64(value);
    } catch {
      return null;
    }
  }

  function decodeHex(value) {
    const bytes = new Uint8Array(value.length / 2);
    for (let index = 0; index < value.length; index += 2) {
      bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
    }
    return bytes;
  }

  function resolveKeyBytes(rawKey) {
    const candidate = String(rawKey || '').trim();
    if (!candidate) {
      throw new Error('Missing transport key. Paste VITE_TRANSPORT_ENCRYPTION_KEY when prompted.');
    }

    let resolved = null;

    if (candidate.startsWith('base64:')) {
      resolved = decodeBase64(candidate.slice(7));
    } else if (/^[0-9a-fA-F]{64}$/.test(candidate)) {
      resolved = decodeHex(candidate);
    } else if (/^[A-Za-z0-9+/]+=*$/.test(candidate)) {
      const decoded = tryDecodeBase64(candidate);
      if (decoded && decoded.byteLength === 32) {
        resolved = decoded;
      }
    }

    if (!resolved) {
      resolved = textEncoder.encode(candidate);
    }

    if (resolved.byteLength !== 32) {
      throw new Error('Transport key must resolve to exactly 32 bytes.');
    }

    return resolved;
  }

  async function getCryptoKey() {
    if (!state.cryptoKeyPromise) {
      const rawKey = resolveKeyBytes(state.keyCandidate);
      state.cryptoKeyPromise = crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt'],
      );
    }

    return state.cryptoKeyPromise;
  }

  function packOpaquePayload(iv, tag, cipherText) {
    const packed = new Uint8Array(iv.byteLength + tag.byteLength + cipherText.byteLength);
    packed.set(iv, 0);
    packed.set(tag, iv.byteLength);
    packed.set(cipherText, iv.byteLength + tag.byteLength);
    return encodeBase64(packed);
  }

  function unpackOpaquePayload(payload) {
    const packed = decodeBase64(payload);
    if (packed.byteLength <= IV_LENGTH_BYTES + TAG_LENGTH_BYTES) {
      throw new Error('Encrypted payload has an invalid shape.');
    }

    return {
      iv: packed.slice(0, IV_LENGTH_BYTES),
      tag: packed.slice(IV_LENGTH_BYTES, IV_LENGTH_BYTES + TAG_LENGTH_BYTES),
      cipherText: packed.slice(IV_LENGTH_BYTES + TAG_LENGTH_BYTES),
    };
  }

  async function encryptPayload(body) {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const plainBytes = textEncoder.encode(JSON.stringify(body));

    const encryptedBytes = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: TAG_LENGTH_BYTES * 8 },
        key,
        plainBytes,
      ),
    );

    if (encryptedBytes.byteLength <= TAG_LENGTH_BYTES) {
      throw new Error('Encrypted request body is invalid.');
    }

    const cipherText = encryptedBytes.slice(0, encryptedBytes.byteLength - TAG_LENGTH_BYTES);
    const tag = encryptedBytes.slice(encryptedBytes.byteLength - TAG_LENGTH_BYTES);

    return {
      payload: packOpaquePayload(iv, tag, cipherText),
    };
  }

  async function decryptEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object' || typeof envelope.payload !== 'string') {
      throw new Error('Response is missing an encrypted payload envelope.');
    }

    const unpacked = unpackOpaquePayload(envelope.payload);
    const encrypted = new Uint8Array(unpacked.cipherText.byteLength + unpacked.tag.byteLength);
    encrypted.set(unpacked.cipherText, 0);
    encrypted.set(unpacked.tag, unpacked.cipherText.byteLength);

    const key = await getCryptoKey();
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unpacked.iv, tagLength: TAG_LENGTH_BYTES * 8 },
      key,
      encrypted,
    );

    const text = textDecoder.decode(new Uint8Array(plainBuffer));
    return JSON.parse(text);
  }

  function normalizeEnvelopeInput(input) {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        throw new Error('Envelope input is empty.');
      }

      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.payload !== 'string') {
          throw new Error('JSON input is not an encrypted payload envelope.');
        }
        return parsed;
      }

      return { payload: trimmed };
    }

    if (input && typeof input === 'object' && typeof input.payload === 'string') {
      return input;
    }

    throw new Error('Envelope input must be a payload string or an object with a payload field.');
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('examhub_user') || 'null');
    } catch {
      return null;
    }
  }

  function detectApiBase() {
    const entries = performance.getEntriesByType('resource');
    for (const entry of entries) {
      if (!entry || typeof entry.name !== 'string') continue;
      const match = entry.name.match(/^(https?:\/\/.+?\/api)(?:\/|$|\?)/i);
      if (match) {
        return match[1].replace(/\/+$/, '');
      }
    }

    return `${location.origin.replace(/\/+$/, '')}/api`;
  }

  function rememberIdentifiers(url, decrypted) {
    if (!decrypted || typeof decrypted !== 'object') return;

    if (decrypted.user && typeof decrypted.user === 'object' && typeof decrypted.user.id === 'string') {
      state.lastUserId = decrypted.user.id;
    }

    if (typeof decrypted.studentId === 'string') {
      state.lastUserId = decrypted.studentId;
    }

    if (typeof decrypted.id === 'string' && /\/exams(?:\?|$)/.test(url)) {
      state.lastExamId = decrypted.id;
    }

    if (typeof decrypted.id === 'string' && /\/results\/submit(?:\?|$)/.test(url)) {
      state.lastSubmissionId = decrypted.id;
    }
  }

  async function summarizeRequest(request) {
    const marker = request.headers.get(HEADER_NAME);
    const hasEncryptedMarker = marker === HEADER_VALUE;
    const rawText = await request.clone().text().catch(() => '');

    if (!rawText) {
      return {
        hasBody: false,
        encrypted: false,
        rawText: '',
        envelope: null,
        decrypted: null,
      };
    }

    let envelope = null;
    try {
      envelope = JSON.parse(rawText);
    } catch {
      envelope = null;
    }

    let decrypted = null;
    if (hasEncryptedMarker && envelope && typeof envelope.payload === 'string') {
      try {
        decrypted = await decryptEnvelope(envelope);
      } catch (error) {
        decrypted = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      hasBody: true,
      encrypted: hasEncryptedMarker,
      rawText,
      envelope,
      decrypted,
    };
  }

  async function summarizeResponse(response) {
    const marker = response.headers.get(HEADER_NAME);
    if (marker !== HEADER_VALUE) {
      return {
        encrypted: false,
        envelope: null,
        decrypted: null,
        note: 'Response is not transport-encrypted.',
      };
    }

    try {
      const envelope = await response.json();
      const decrypted = await decryptEnvelope(envelope);
      return {
        encrypted: true,
        envelope,
        decrypted,
        note: null,
      };
    } catch (error) {
      return {
        encrypted: true,
        envelope: null,
        decrypted: null,
        note: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function inspectExchange(request, response) {
    const method = request.method;
    const url = request.url;
    const [requestSummary, responseSummary] = await Promise.all([
      summarizeRequest(request),
      summarizeResponse(response),
    ]);

    if (responseSummary.decrypted) {
      rememberIdentifiers(url, responseSummary.decrypted);
    }

    state.lastExchange = {
      method,
      url,
      status: response.status,
      request: requestSummary,
      response: responseSummary,
    };

    console.groupCollapsed(`[demo] ${method} ${url} -> ${response.status}`);

    if (requestSummary.hasBody) {
      console.log('Encrypted request body:', requestSummary.envelope ?? requestSummary.rawText);
      if (requestSummary.decrypted) {
        console.log('Decrypted request body:', requestSummary.decrypted);
      }
    } else {
      console.log('Request body: <empty>');
    }

    if (responseSummary.encrypted) {
      console.log('Encrypted response body:', responseSummary.envelope);
      if (responseSummary.decrypted) {
        console.log('Decrypted response body:', responseSummary.decrypted);
      } else if (responseSummary.note) {
        console.log('Response decrypt note:', responseSummary.note);
      }
    } else {
      console.log('Response note:', responseSummary.note);
    }

    console.groupEnd();

    return responseSummary.decrypted;
  }

  function getOriginalFetch() {
    if (typeof window.__demoOriginalFetch === 'function') {
      return window.__demoOriginalFetch.bind(window);
    }

    const boundFetch = window.fetch.bind(window);
    window.__demoOriginalFetch = boundFetch;
    return boundFetch;
  }

  function wrapFetch() {
    if (state.wrapped) return;

    const originalFetch = getOriginalFetch();

    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const response = await originalFetch(input, init);

      if (request.url.includes('/api')) {
        void inspectExchange(request, response.clone());
      }

      return response;
    };

    state.wrapped = true;
  }

  async function demoCall(method, path, body) {
    const normalizedMethod = String(method || 'GET').toUpperCase();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${state.apiBase}${normalizedPath}`;

    const headers = {
      'Content-Type': 'application/json',
      [HEADER_NAME]: HEADER_VALUE,
    };

    const token = localStorage.getItem('examhub_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const encryptedBody = body === undefined ? undefined : await encryptPayload(body);
    const response = await getOriginalFetch()(url, {
      method: normalizedMethod,
      headers,
      body: encryptedBody ? JSON.stringify(encryptedBody) : undefined,
    });

    const syntheticRequest = new Request(url, {
      method: normalizedMethod,
      headers,
      body: encryptedBody ? JSON.stringify(encryptedBody) : undefined,
    });
    const decrypted = await inspectExchange(syntheticRequest, response.clone());

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return decrypted;
  }

  async function demoEncryptBody(body) {
    const envelope = await encryptPayload(body);
    console.log('Encrypted envelope:', envelope);
    return envelope;
  }

  async function demoDecryptEnvelope(input) {
    const envelope = normalizeEnvelopeInput(input);
    const decrypted = await decryptEnvelope(envelope);
    console.log('Decrypted payload:', decrypted);
    return decrypted;
  }

  state.apiBase = prompt(
    'Confirm the deployed API base URL',
    detectApiBase(),
  ) || detectApiBase();
  state.apiBase = state.apiBase.trim().replace(/\/+$/, '');
  state.keyCandidate = prompt(
    'Paste the deployed VITE_TRANSPORT_ENCRYPTION_KEY',
    '',
  ) || '';

  wrapFetch();

  window.demoState = state;
  window.demoCall = demoCall;
  window.demoEncryptBody = demoEncryptBody;
  window.demoDecryptEnvelope = demoDecryptEnvelope;
  window.demoUser = getStoredUser;

  console.log('Backend demo helper ready.', {
    apiBase: state.apiBase,
    currentUser: getStoredUser(),
    usage: [
      "await demoEncryptBody({ sample: 'hello' })",
      "await demoDecryptEnvelope('{\"payload\":\"...\"}')",
      "await demoCall('GET', '/users/profile')",
      "demoState.lastExchange",
      "await demoCall('GET', '/exams')",
      "await demoCall('GET', '/exams/' + demoState.lastExamId)",
      "await demoCall('GET', '/results/student/' + demoUser().id)",
      "await demoCall('GET', '/admin/exams')",
      "await demoCall('GET', '/admin/results')",
      "await demoCall('GET', '/reports/exam-performance')",
      "await demoCall('GET', '/reports/pass-fail')",
    ],
  });
})();
