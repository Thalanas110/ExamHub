import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import {
  type ApiDocsVerifyCheck,
  type EndpointDoc,
  PHP_BASE_URL,
} from '@/entities/api-docs';
import { PHP_BASE_URL } from '@/shared/api';
import { endpointKey, METHOD_STYLES } from '../lib/api-reference';
import { ENDPOINT_CODE_MAP } from '../lib/endpoint-code-map';
import { CopyButton } from './CopyButton';
import { MethodBadge } from './MethodBadge';
import { VerificationBadge } from './VerificationBadge';
import { TryItPanel } from './TryItPanel';

export function EndpointCard({ endpoint, check }: { endpoint: EndpointDoc; check?: ApiDocsVerifyCheck }) {
  const [open, setOpen] = useState(false);
  const codeDependencies = ENDPOINT_CODE_MAP[endpoint.id];

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${METHOD_STYLES[endpoint.method].panel}`}>
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(previous => !previous)}
      >
        <MethodBadge method={endpoint.method} />
        <code className="flex-1 text-sm font-mono font-medium text-gray-800 truncate">{endpoint.path}</code>
        <VerificationBadge check={check} />
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {endpoint.auth ? (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Lock className="w-3 h-3" />
              Auth
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3" />
              Public
            </span>
          )}
          {endpoint.role && (
            <span className="text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 hidden md:inline">
              {endpoint.role}
            </span>
          )}
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600">{endpoint.description}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Full URL:</span>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono break-all">
                {PHP_BASE_URL}
                {endpoint.path.replace('/api', '')}
              </code>
              <CopyButton text={`${PHP_BASE_URL}${endpoint.path.replace('/api', '')}`} />
            </div>
          </div>

          <div className="px-5 py-3 bg-gray-50">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verification Result</h4>
            {check ? (
              <div className="space-y-1 text-xs">
                <div className={check.exists ? 'text-emerald-700' : 'text-rose-700'}>
                  {check.exists ? 'Endpoint is present in backend route code.' : 'Endpoint is missing from backend route code.'}
                </div>
                <div className="text-gray-500">
                  Source file: <code className="bg-white border border-gray-200 px-1 rounded">{check.sourceFile ?? 'n/a'}</code>
                </div>
                <div className="text-gray-500">
                  Matched route: <code className="bg-white border border-gray-200 px-1 rounded">{check.matchedRoute ?? 'n/a'}</code>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Run endpoint verification to populate backend match details.</div>
            )}
          </div>

          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Code Dependencies</h4>
            {codeDependencies ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-3 bg-emerald-50/40">
                  <div className="text-xs font-semibold text-emerald-900">Backend (.php)</div>
                  <div className="mt-2 space-y-2">
                    {codeDependencies.backend.map(reference => (
                      <div key={`${reference.file}:${reference.line}`} className="text-xs text-emerald-900">
                        <code className="block bg-white border border-emerald-200 rounded px-2 py-1 font-mono break-all">
                          {reference.file}:{reference.line}
                        </code>
                        <div className="mt-1 text-emerald-800/90">{reference.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3 bg-sky-50/50">
                  <div className="text-xs font-semibold text-sky-900">Frontend (.ts/.tsx)</div>
                  <div className="mt-2 space-y-2">
                    {codeDependencies.frontend.map(reference => (
                      <div key={`${reference.file}:${reference.line}`} className="text-xs text-sky-900">
                        <code className="block bg-white border border-sky-200 rounded px-2 py-1 font-mono break-all">
                          {reference.file}:{reference.line}
                        </code>
                        <div className="mt-1 text-sky-800/90">{reference.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                No dependency map entry is currently documented for this endpoint.
              </div>
            )}
          </div>

          {endpoint.requestBody && (
            <div className="px-5 py-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Request Body (JSON)</h4>
              <div className="data-table-scroll overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium pr-4">Field</th>
                      <th className="text-left pb-2 font-medium pr-4">Type</th>
                      <th className="text-left pb-2 font-medium pr-4">Required</th>
                      <th className="text-left pb-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(endpoint.requestBody).map(([field, info]) => (
                      <tr key={field} className="hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <code className="text-blue-700 font-mono font-medium">{field}</code>
                        </td>
                        <td className="py-2 pr-4">
                          <code className="text-emerald-700 font-mono text-xs">{info.type}</code>
                        </td>
                        <td className="py-2 pr-4">
                          {info.required ? <span className="text-rose-500 font-medium">Required</span> : <span className="text-gray-400">Optional</span>}
                        </td>
                        <td className="py-2 text-gray-500">{info.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Response Example (200 OK)</h4>
              <CopyButton text={JSON.stringify(endpoint.responseExample, null, 2)} />
            </div>
            <pre className="bg-gray-950 text-green-400 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
              {JSON.stringify(endpoint.responseExample, null, 2)}
            </pre>
          </div>

          <div>
            <TryItPanel endpoint={endpoint} />
          </div>
        </div>
      )}
    </div>
  );
}

export function GroupSection({
  group,
  endpoints,
  verifyIndex,
}: {
  group: string;
  endpoints: EndpointDoc[];
  verifyIndex: Map<string, ApiDocsVerifyCheck>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const verifiedCount = endpoints.filter(endpoint => verifyIndex.get(endpointKey(endpoint.method, endpoint.path))?.exists).length;

  return (
    <div>
      <button className="flex items-center gap-2 mb-3 group" onClick={() => setCollapsed(previous => !previous)}>
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        )}
        <h2 className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{group}</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{endpoints.length}</span>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
          {verifiedCount}/{endpoints.length}
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-2 ml-6">
          {endpoints.map(endpoint => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} check={verifyIndex.get(endpointKey(endpoint.method, endpoint.path))} />
          ))}
        </div>
      )}
    </div>
  );
}
