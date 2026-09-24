import React from 'react';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';
import type { ApiDocsVerifyResult } from '@/entities/api-docs';

type VerifyState = 'idle' | 'loading' | 'verified' | 'error';

interface VerificationPanelProps {
  state: VerifyState;
  result: ApiDocsVerifyResult | null;
  errorMessage: string;
  onVerify: () => void;
  onExport: () => void;
}

export function VerificationPanel({
  state,
  result,
  errorMessage,
  onVerify,
  onExport,
}: VerificationPanelProps) {
  const matched = result?.summary.matched ?? 0;
  const required = result?.summary.required ?? 13;
  const missing = result?.summary.missing ?? 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-900 bg-gray-950 text-gray-100">
      <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Swagger-style Backend Verification</h2>
            <p className="text-xs text-gray-400">Checks required endpoints against backend route source code.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 bg-gray-900 text-gray-100 font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={onVerify}
            disabled={state === 'loading'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-gray-950 font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60 transition-colors"
          >
            <Sparkles className={`w-4 h-4 ${state === 'loading' ? 'animate-pulse' : ''}`} />
            {state === 'loading' ? 'Verifying...' : 'Verify Endpoints'}
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">Required</div>
            <div className="text-xl font-bold">{required}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">Verified</div>
            <div className="text-xl font-bold text-emerald-400">{matched}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">Missing</div>
            <div className={`text-xl font-bold ${missing > 0 ? 'text-rose-400' : 'text-gray-100'}`}>{missing}</div>
          </div>
        </div>

        {state === 'error' && (
          <div className="mt-3 text-xs text-rose-300 bg-rose-950/30 border border-rose-700 rounded-lg px-3 py-2">
            Verification failed: {errorMessage}
          </div>
        )}

        {result && (
          <div className="mt-3 text-xs text-gray-400">
            Last run: <span className="text-gray-200 font-mono">{new Date(result.generatedAt).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
