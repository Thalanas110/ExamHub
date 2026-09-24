import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  API_ENDPOINTS,
  docsApi,
  PHP_BASE_URL,
  type ApiDocsVerifyCheck,
  type ApiDocsVerifyResult,
  type HttpMethod,
} from '../../services/api';
import { toast } from 'sonner';
import { endpointKey, GROUP_ORDER } from '../../features/admin/api-reference/lib/api-reference';
import { ENDPOINT_CODE_MAP } from '../../features/admin/api-reference/lib/endpoint-code-map';
import { CopyButton } from '../../features/admin/api-reference/components/CopyButton';
import { GroupSection } from '../../features/admin/api-reference/components/EndpointCard';
import { PhpBackendPanel } from '../../features/admin/api-reference/components/PhpBackendPanel';
import { VerificationPanel } from '../../features/admin/api-reference/components/VerificationPanel';
import { Modal } from '@/shared/ui/Modal';
import templateFooterUrl from '../../assets/api-docs-template-contact-footer.jpg';
import templateHeaderUrl from '../../assets/api-docs-template-header.jpg';

type VerifyState = 'idle' | 'loading' | 'verified' | 'error';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isGithubUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    return (url.protocol === 'https:' || url.protocol === 'http:') && hostname === 'github.com' && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function AdminApiReference() {
  const [filter, setFilter] = useState<'all' | HttpMethod>('all');
  const [search, setSearch] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState<ApiDocsVerifyResult | null>(null);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubUrlError, setGithubUrlError] = useState('');

  const filtered = API_ENDPOINTS.filter(endpoint => {
    const matchesMethod = filter === 'all' || endpoint.method === filter;
    const query = search.toLowerCase();
    const matchesSearch = query === ''
      || endpoint.path.toLowerCase().includes(query)
      || endpoint.description.toLowerCase().includes(query)
      || endpoint.group.toLowerCase().includes(query);

    return matchesMethod && matchesSearch;
  });

  const grouped = GROUP_ORDER
    .map(group => ({
      group,
      endpoints: filtered.filter(endpoint => endpoint.group === group),
    }))
    .filter(group => group.endpoints.length > 0);

  const methodCounts: Record<string, number> = {};
  API_ENDPOINTS.forEach(endpoint => {
    methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;
  });

  const verifyIndex = useMemo(() => {
    const map = new Map<string, ApiDocsVerifyCheck>();
    (verifyResult?.checks ?? []).forEach(check => {
      map.set(endpointKey(check.method, check.path), check);
    });
    return map;
  }, [verifyResult]);

  const handleVerify = async () => {
    setVerifyState('loading');
    setVerifyError('');
    try {
      const result = await docsApi.verify();
      setVerifyResult(result);
      setVerifyState('verified');

      if (result.summary.missing === 0) {
        toast.success(`All ${result.summary.required} required endpoints were verified.`);
      } else {
        toast.error(`${result.summary.missing} required endpoints are missing in backend route code.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerifyError(message);
      setVerifyState('error');
      toast.error(`Endpoint verification failed: ${message}`);
    }
  };

  const openExportDialog = () => {
    setGithubUrl('');
    setGithubUrlError('');
    setIsGithubModalOpen(true);
  };

  const closeExportDialog = () => {
    setIsGithubModalOpen(false);
    setGithubUrl('');
    setGithubUrlError('');
  };

  const handleExport = (requiredGithubUrl: string) => {
    const generatedAt = new Date().toLocaleString();
    const signatureDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const templateHeader = new URL(templateHeaderUrl, window.location.href).href;
    const templateFooter = new URL(templateFooterUrl, window.location.href).href;
    const groupedEndpoints = [
      ...GROUP_ORDER,
      ...Array.from(new Set(API_ENDPOINTS.map(endpoint => endpoint.group))).filter(group => !GROUP_ORDER.includes(group)),
    ]
      .map(groupName => ({
        groupName,
        endpoints: API_ENDPOINTS.filter(endpoint => endpoint.group === groupName),
      }))
      .filter(group => group.endpoints.length > 0);

    const groupSections = groupedEndpoints.map((group, index) => {
      const groupRows = group.endpoints.map(endpoint => {
        const check = verifyIndex.get(endpointKey(endpoint.method, endpoint.path));
        const statusLabel = check ? (check.exists ? 'Verified' : 'Missing') : 'Not Verified';
        const statusTone = check ? (check.exists ? '#15803d' : '#b91c1c') : '#334155';
        const dependencies = ENDPOINT_CODE_MAP[endpoint.id];
        const backendRows = (dependencies?.backend ?? []).map(reference => `
          <li>
            <code>${escapeHtml(reference.file)}:${reference.line}</code>
            <span>${escapeHtml(reference.detail)}</span>
          </li>
        `).join('');
        const frontendRows = (dependencies?.frontend ?? []).map(reference => `
          <li>
            <code>${escapeHtml(reference.file)}:${reference.line}</code>
            <span>${escapeHtml(reference.detail)}</span>
          </li>
        `).join('');

        return `
          <tr class="endpoint-row">
            <td>${escapeHtml(endpoint.method)}</td>
            <td><code>${escapeHtml(endpoint.path)}</code></td>
            <td>${escapeHtml(endpoint.description)}</td>
            <td style="color:${statusTone};font-weight:600;">${statusLabel}</td>
          </tr>
          <tr class="dependency-row">
            <td colspan="4">
              <div class="dependency-grid">
                <div class="dependency-panel">
                  <strong>Backend (.php)</strong>
                  <ul>
                    ${backendRows || '<li>Not documented.</li>'}
                  </ul>
                </div>
                <div class="dependency-panel">
                  <strong>Frontend (.ts/.tsx)</strong>
                  <ul>
                    ${frontendRows || '<li>Not documented.</li>'}
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      const pageClass = index === 0 ? 'group-section first-group-section' : 'group-section';
      return `
        <section class="${pageClass}">
          <h2 class="group-title">${escapeHtml(group.groupName)}</h2>
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${groupRows}</tbody>
          </table>
        </section>
      `;
    }).join('');

    const summary = verifyResult
      ? `${verifyResult.summary.matched}/${verifyResult.summary.required} verified, ${verifyResult.summary.missing} missing`
      : 'Verification has not been run yet.';

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>API Documentation Export</title>
          <style>
            :root {
              --print-page-side-margin: 0.58in;
              --print-header-height: 1.32in;
              --print-footer-height: 1.08in;
              --print-top-gap: 0.08in;
              --print-bottom-gap: 0.16in;
              --print-first-page-top-offset: calc(var(--print-header-height) + var(--print-top-gap));
            }
            @page { size: Letter portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.35; }
            .template-header,
            .template-footer {
              position: fixed;
              left: 0;
              right: 0;
              width: 100%;
              z-index: 1;
            }
            .template-header {
              top: 0;
              height: var(--print-header-height);
            }
            .template-footer {
              bottom: 0;
              height: var(--print-footer-height);
            }
            .template-header img,
            .template-footer img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: fill;
            }
            .content {
              position: relative;
              z-index: 2;
              padding: 0 var(--print-page-side-margin);
            }
            .intro {
              padding-top: var(--print-first-page-top-offset);
              margin-bottom: 6px;
            }
            h1 { margin: 0 0 6px; font-size: 18px; }
            .meta { margin-bottom: 0; color: #334155; }
            .group-sections {
              margin-top: 6px;
            }
            .group-section {
              padding-top: calc(var(--print-header-height) + var(--print-top-gap));
              padding-bottom: calc(var(--print-footer-height) + var(--print-bottom-gap));
              break-before: page;
              page-break-before: always;
            }
            .first-group-section {
              padding-top: 0;
              break-before: auto;
              page-break-before: auto;
            }
            .group-section:last-of-type {
              padding-bottom: 6px;
            }
            .group-title {
              margin: 0 0 8px;
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
            code { font-family: Consolas, monospace; font-size: 11px; }
            .endpoint-row td {
              background: #ffffff;
            }
            .dependency-row td {
              background: #f8fafc;
              padding: 8px 7px;
            }
            .dependency-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .dependency-panel {
              border: 1px solid #cbd5e1;
              background: #ffffff;
              border-radius: 6px;
              padding: 6px 8px;
            }
            .dependency-panel strong {
              display: inline-block;
              margin-bottom: 4px;
              font-size: 10px;
            }
            .dependency-panel ul {
              margin: 0;
              padding-left: 14px;
            }
            .dependency-panel li {
              margin: 0 0 3px;
              color: #334155;
            }
            .dependency-panel li span {
              display: block;
              margin-top: 1px;
            }
            .signoff {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 28px;
              margin-top: 15px;
              margin-bottom: calc(var(--print-footer-height) + var(--print-bottom-gap));
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .signature-line {
              border-top: 1px solid #0f172a;
              padding-top: 6px;
              margin-top: 14px;
              font-weight: 700;
            }
            .signature-meta,
            .member-list {
              color: #334155;
              font-size: 11px;
            }
            .member-list {
              margin: 8px 0 0;
              padding-left: 18px;
            }
            thead { display: table-header-group; }
            tr { break-inside: avoid; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="template-header">
            <img src="${escapeHtml(templateHeader)}" alt="" />
          </div>
          <div class="template-footer">
            <img src="${escapeHtml(templateFooter)}" alt="" />
          </div>
          <div class="content">
            <div class="intro">
              <h1>Group 8 API Documentation</h1>
              <div class="meta">
                Generated: ${escapeHtml(generatedAt)}<br />
                Base URL: ${escapeHtml(PHP_BASE_URL)}<br />
                GitHub Repository: ${escapeHtml(requiredGithubUrl)}<br />
                Verification: ${escapeHtml(summary)}
              </div>
            </div>
            <div class="group-sections">${groupSections}</div>
            <div class="signoff">
              <div>
                <div class="signature-line">Adriaan Dimate</div>
                <div class="signature-meta">Leader</div>
                <div class="signature-meta">Date: ${escapeHtml(signatureDate)}</div>
              </div>
              <div>
                <strong>Members</strong>
                <ol class="member-list">
                  <li>Adriaan Dimate</li>
                  <li>Louise Jelaine Alvarez</li>
                  <li>Jommel Yee</li>
                </ol>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument;
    const frameWindow = iframe.contentWindow;
    if (!frameDoc || !frameWindow) {
      iframe.remove();
      toast.error('Unable to initialize PDF export.');
      return;
    }

    let printed = false;
    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1500);
    };

    const printFrame = () => {
      if (printed) {
        return;
      }
      printed = true;
      frameWindow.focus();
      frameWindow.print();
      toast.success('Print dialog opened. Choose "Save as PDF".');
      cleanup();
    };

    iframe.onload = printFrame;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    window.setTimeout(printFrame, 2500);
  };

  const submitGithubUrl = () => {
    const trimmedGithubUrl = githubUrl.trim();
    if (!isGithubUrl(trimmedGithubUrl)) {
      setGithubUrlError('Enter a valid GitHub repository link, for example https://github.com/org/repo.');
      return;
    }

    closeExportDialog();
    handleExport(trimmedGithubUrl);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">API Reference + Verification</h1>
          </div>
          <p className="text-sm text-gray-500">
            <strong>GROUP 8</strong> - Online Examination System - <span className="text-emerald-700 font-medium">Swagger-style route verification</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
          <Server className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Base URL:</span>
          <code className="font-mono text-blue-700 text-xs truncate max-w-xs">{PHP_BASE_URL}</code>
          <CopyButton text={PHP_BASE_URL} />
        </div>
      </div>

      <VerificationPanel
        state={verifyState}
        result={verifyResult}
        errorMessage={verifyError}
        onVerify={handleVerify}
        onExport={openExportDialog}
      />

      <PhpBackendPanel />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Endpoints', value: API_ENDPOINTS.length, icon: BookOpen },
          { label: 'GET', value: methodCounts.GET ?? 0, icon: Server },
          { label: 'POST', value: methodCounts.POST ?? 0, icon: Zap },
          { label: 'PUT / DELETE', value: (methodCounts.PUT ?? 0) + (methodCounts.DELETE ?? 0), icon: ShieldCheck },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <card.icon className="w-4.5 h-4.5 text-gray-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search endpoints..."
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'GET', 'POST', 'PUT', 'DELETE'] as const).map(method => (
            <button
              key={method}
              onClick={() => setFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === method
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {method === 'all' ? `All (${API_ENDPOINTS.length})` : method}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {grouped.length > 0 ? (
          grouped.map(({ group, endpoints }) => (
            <GroupSection key={group} group={group} endpoints={endpoints} verifyIndex={verifyIndex} />
          ))
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">No endpoints match your search.</div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-xs text-gray-500">
        <strong className="text-gray-700">Verification note:</strong>{' '}
        clicking <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">Verify Endpoints</code>{' '}
        calls <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">GET /api/docs/verify</code>{' '}
        and checks your required routes directly against backend route source files. Export opens the browser print dialog in the same tab for PDF saving.
      </div>

      <Modal
        isOpen={isGithubModalOpen}
        onClose={closeExportDialog}
        title="GitHub Repository Required"
        size="sm"
        footer={(
          <>
            <button
              type="button"
              onClick={closeExportDialog}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitGithubUrl}
              className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-700"
            >
              Export PDF
            </button>
          </>
        )}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitGithubUrl();
          }}
        >
          <label className="block text-sm font-medium text-gray-700" htmlFor="api-docs-github-url">
            GitHub repository link
          </label>
          <input
            id="api-docs-github-url"
            type="url"
            value={githubUrl}
            onChange={(event) => {
              setGithubUrl(event.target.value);
              if (githubUrlError) {
                setGithubUrlError('');
              }
            }}
            placeholder="https://github.com/group8/examhub"
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            autoFocus
          />
          {githubUrlError && (
            <div className="text-xs text-rose-600">{githubUrlError}</div>
          )}
        </form>
      </Modal>
    </div>
  );
}
