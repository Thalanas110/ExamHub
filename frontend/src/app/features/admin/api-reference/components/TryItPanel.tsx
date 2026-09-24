import React, { useState } from 'react';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';
import { PHP_BASE_URL, type EndpointDoc } from '../../../../services/api';

function buildDefaultBody(requestBody: EndpointDoc['requestBody']): string {
  if (!requestBody) return '';
  const obj: Record<string, unknown> = {};
  for (const [key, info] of Object.entries(requestBody)) {
    const t = info.type.toLowerCase();
    if (t === 'number') obj[key] = 0;
    else if (t === 'boolean') obj[key] = false;
    else if (t.includes('[]')) obj[key] = [];
    else if (t.includes('datetime') || t.includes('iso')) obj[key] = new Date().toISOString().slice(0, 16);
    else obj[key] = '';
  }
  return JSON.stringify(obj, null, 2);
}

function extractPathParams(path: string): string[] {
  return [...path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)].map(m => m[1]);
}

export function TryItPanel({ endpoint }: { endpoint: EndpointDoc }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('examhub_token') ?? '');
  const pathParams = extractPathParams(endpoint.path);
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    Object.fromEntries(pathParams.map(p => [p, ''])),
  );
  const [body, setBody] = useState(() => buildDefaultBody(endpoint.requestBody));
  const [bodyError, setBodyError] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: unknown } | null>(null);
  const [fetchError, setFetchError] = useState('');

  const buildUrl = () => {
    let path = endpoint.path.replace(/^\/api/, '');
    for (const [key, value] of Object.entries(paramValues)) {
      path = path.replace(`:${key}`, encodeURIComponent(value) || `:${key}`);
    }
    return `${PHP_BASE_URL}${path}`;
  };

  const handleSend = async () => {
    setBodyError('');
    setFetchError('');
    setResponse(null);

    let parsedBody: unknown;
    if (body.trim() && endpoint.requestBody) {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        setBodyError('Invalid JSON — fix the body before sending.');
        return;
      }
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;

      const res = await fetch(buildUrl(), {
        method: endpoint.method,
        headers,
        body: parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined,
      });

      const json = await res.json().catch(() => null);
      if (json === null) {
        throw new Error('JSON response body is missing.');
      }

      setResponse({ status: res.status, body: json });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: number) => {
    if (status < 300) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status < 500) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="px-5 py-4">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors"
        onClick={() => setOpen(prev => !prev)}
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Try It Out
      </button>

      {open && (
        <div className="mt-3 space-y-3">

          {/* Bearer Token */}
          {endpoint.auth && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Bearer Token
              </label>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste token or leave blank"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
              />
            </div>
          )}

          {/* Path Params */}
          {pathParams.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Path Parameters
              </label>
              <div className="space-y-1.5">
                {pathParams.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <code className="text-xs text-blue-700 font-mono w-24 flex-shrink-0 truncate">{p}</code>
                    <input
                      type="text"
                      value={paramValues[p] ?? ''}
                      onChange={e => setParamValues(prev => ({ ...prev, [p]: e.target.value }))}
                      placeholder={`Enter ${p}`}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Request Body (JSON)
              </label>
              <textarea
                value={body}
                onChange={e => { setBody(e.target.value); setBodyError(''); }}
                rows={7}
                spellCheck={false}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono resize-y focus:outline-none focus:ring-2 bg-gray-950 text-green-400 ${
                  bodyError ? 'border-red-500 focus:ring-red-400' : 'border-gray-700 focus:ring-violet-400'
                }`}
              />
              {bodyError && <p className="text-xs text-red-500 mt-1">{bodyError}</p>}
            </div>
          )}

          {/* URL preview */}
          <div className="text-[11px] font-mono break-all text-gray-400">
            <span className="text-violet-600 font-semibold">{endpoint.method}</span>{' '}
            {buildUrl()}
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Sending…' : 'Send Request'}
          </button>

          {/* Network error */}
          {fetchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {fetchError}
            </div>
          )}

          {/* Response */}
          {response && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor(response.status)}`}>
                  {response.status}
                </span>
                <span className="text-[11px] text-gray-500">Response</span>
              </div>
              <pre className="bg-gray-950 text-green-400 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap break-all">
                {JSON.stringify(response.body, null, 2)}
              </pre>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
