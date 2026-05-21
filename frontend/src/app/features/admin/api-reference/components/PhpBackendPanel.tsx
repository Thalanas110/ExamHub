import React, { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../../../components/shared/Modal';
import { dataApi, PHP_BASE_URL } from '../../../../services/api';
import { CopyButton } from './CopyButton';

const RESEED_CONFIRMATION_FACTORS = Array.from(
  { length: 20 },
  (_, index) => `RESET FACTOR ${String(index + 1).padStart(2, '0')}`,
);
const RESEED_FACTOR_TEMPLATE = RESEED_CONFIRMATION_FACTORS.join('\n');

export function PhpBackendPanel() {
  const [reseeding, setReseeding] = useState(false);
  const [showReseedAuth, setShowReseedAuth] = useState(false);
  const [reseedFactorBlock, setReseedFactorBlock] = useState('');
  const [reseedAuthError, setReseedAuthError] = useState('');

  const reseedFactors = useMemo(
    () => reseedFactorBlock
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0),
    [reseedFactorBlock],
  );

  const matchedFactorCount = useMemo(
    () => RESEED_CONFIRMATION_FACTORS.reduce((count, expected, index) => (
      reseedFactors[index] === expected ? count + 1 : count
    ), 0),
    [reseedFactors],
  );

  const mismatchDetails = useMemo(
    () => RESEED_CONFIRMATION_FACTORS
      .map((expected, index) => ({
        index,
        expected,
        actual: reseedFactors[index] ?? '',
      }))
      .filter(item => item.actual !== item.expected),
    [reseedFactors],
  );

  const resetReseedAuth = () => {
    setReseedFactorBlock('');
    setReseedAuthError('');
  };

  const openReseedAuth = () => {
    resetReseedAuth();
    setShowReseedAuth(true);
  };

  const closeReseedAuth = () => {
    if (reseeding) {
      return;
    }

    setShowReseedAuth(false);
    resetReseedAuth();
  };

  const handleReseed = async () => {
    const normalizedFactors = reseedFactors.map(factor => factor.trim());
    const hasAllFactors = RESEED_CONFIRMATION_FACTORS.every((factor, index) => normalizedFactors[index] === factor)
      && normalizedFactors.length === RESEED_CONFIRMATION_FACTORS.length;
    if (!hasAllFactors) {
      setReseedAuthError('All 20 reset factors must match exactly before reseeding.');
      return;
    }

    setReseeding(true);
    try {
      const result = await dataApi.reseed(normalizedFactors);
      setShowReseedAuth(false);
      resetReseedAuth();
      toast.success(result.message || 'Database reseeded successfully.');
    } catch (error) {
      toast.error(`Reseed failed: ${error}`);
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
          <Server className="w-4.5 h-4.5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Backend Configuration</h2>
          <p className="text-xs text-gray-500">Frontend is locked to your PHP backend.</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-2">PHP Base URL</div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-blue-700 break-all">{PHP_BASE_URL}</code>
            <CopyButton text={PHP_BASE_URL} />
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Danger Zone
              </div>
              <p className="text-sm text-gray-700 max-w-2xl">
                Permanently wipes current users, exams, classes, and submissions, then restores seed records.
                This action cannot be undone.
              </p>
              <div className="text-xs text-gray-500">
                Executes <code className="bg-white px-1 rounded font-mono">POST /api/data/reseed</code> on the PHP backend.
              </div>
            </div>

            <button
              onClick={openReseedAuth}
              disabled={reseeding}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reseeding ? 'animate-spin' : ''}`} />
              {reseeding ? 'Reseeding...' : 'Reset to Seed Data'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showReseedAuth}
        onClose={closeReseedAuth}
        title="20-Factor Reset Authentication"
        size="lg"
        footer={(
          <>
            <button
              type="button"
              onClick={closeReseedAuth}
              disabled={reseeding}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reseed-auth-form"
              disabled={reseeding}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reseeding ? 'animate-spin' : ''}`} />
              {reseeding ? 'Reseeding...' : 'Authenticate and Reset'}
            </button>
          </>
        )}
      >
        <form
          id="reseed-auth-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleReseed();
          }}
        >
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            This will wipe all current data and restore the database to its seed state.
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">20-Factor Authentication Block</div>
                <p className="text-xs text-gray-500">
                  Enter all 20 reset factors in order, one line per factor.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
                <span className="text-[11px] font-medium text-gray-500">Copy template</span>
                <CopyButton text={RESEED_FACTOR_TEMPLATE} />
              </div>
            </div>

            <textarea
              value={reseedFactorBlock}
              onChange={(event) => {
                setReseedFactorBlock(event.target.value);
                if (reseedAuthError) {
                  setReseedAuthError('');
                }
              }}
              placeholder={RESEED_FACTOR_TEMPLATE}
              autoComplete="off"
              spellCheck={false}
              rows={10}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm font-mono leading-6 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="font-semibold text-gray-900">Lines Entered</div>
                <div className="text-gray-600">{reseedFactors.length} / 20</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="font-semibold text-gray-900">Exact Matches</div>
                <div className="text-gray-600">{matchedFactorCount} / 20</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="font-semibold text-gray-900">Remaining</div>
                <div className="text-gray-600">{Math.max(20 - matchedFactorCount, 0)}</div>
              </div>
            </div>

            {mismatchDetails.length > 0 && reseedFactors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="font-semibold mb-1">Mismatched lines</div>
                {mismatchDetails.slice(0, 4).map(item => (
                  <div key={item.expected}>
                    Line {item.index + 1}: expected <code className="font-mono">{item.expected}</code>
                    {item.actual !== '' && (
                      <>
                        {' '}but got <code className="font-mono">{item.actual}</code>
                      </>
                    )}
                  </div>
                ))}
                {mismatchDetails.length > 4 && (
                  <div className="mt-1">+ {mismatchDetails.length - 4} more mismatch{mismatchDetails.length - 4 !== 1 ? 'es' : ''}</div>
                )}
              </div>
            )}

            <details className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-gray-700">
                Show expected factors
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-2 text-[11px] leading-5 text-gray-700">{RESEED_FACTOR_TEMPLATE}</pre>
            </details>
          </div>

          {reseedAuthError && (
            <div className="text-xs text-red-600">{reseedAuthError}</div>
          )}
        </form>
      </Modal>
    </div>
  );
}
