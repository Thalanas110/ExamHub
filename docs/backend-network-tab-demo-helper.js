(() => {
  const state = {
    apiBase: '',
    lastUserId: null,
    lastExamId: null,
    lastSubmissionId: null,
    lastExchange: null,
  };

  function detectApiBase() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/group8' || path.startsWith('/group8/')) {
      return `${window.location.origin}/group8/api`;
    }
    return `${window.location.origin}/api`;
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('examhub_user') || 'null');
    } catch {
      return null;
    }
  }

  function rememberIdentifiers(url, payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.user && typeof payload.user === 'object' && typeof payload.user.id === 'string') {
      state.lastUserId = payload.user.id;
    }
    if (typeof payload.studentId === 'string') state.lastUserId = payload.studentId;
    if (typeof payload.id === 'string' && /\/exams(?:\?|$)/.test(url)) state.lastExamId = payload.id;
    if (typeof payload.id === 'string' && /\/results\/submit(?:\?|$)/.test(url)) {
      state.lastSubmissionId = payload.id;
    }
  }

  async function demoCall(method, path, body) {
    const url = `${state.apiBase}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('examhub_token');
    if (token) headers.Authorization = `Bearer ${token}`;

    const requestBody = body === undefined ? undefined : JSON.stringify(body);
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });
    const responseBody = await response.json().catch(() => null);

    state.lastExchange = {
      request: { method, url, body: body ?? null },
      response: { status: response.status, body: responseBody },
    };
    console.log('JSON request:', state.lastExchange.request);
    console.log('JSON response:', state.lastExchange.response);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(responseBody)}`);
    }

    rememberIdentifiers(path, responseBody);
    return responseBody;
  }

  state.apiBase = (prompt('Confirm the deployed API base URL', detectApiBase()) || detectApiBase())
    .trim()
    .replace(/\/+$/, '');

  window.demoState = state;
  window.demoCall = demoCall;
  window.demoUser = getStoredUser;

  console.log('Backend demo helper ready.', {
    apiBase: state.apiBase,
    currentUser: getStoredUser(),
    usage: [
      "await demoCall('GET', '/users/profile')",
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
