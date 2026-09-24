import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Server, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/shared/ui/Modal';
import { dataApi, PHP_BASE_URL } from '../../../../services/api';
import { CopyButton } from './CopyButton';

const RESEED_CONFIRMATION_PHRASE = 'RESET TO SEED DATA';

export function PhpBackendPanel() {
  const [reseeding, setReseeding] = useState(false);
  const [showReseedAuth, setShowReseedAuth] = useState(false);
  const [reseedConfirmationText, setReseedConfirmationText] = useState('');
  const [reseedAuthError, setReseedAuthError] = useState('');

  const normalizedConfirmationText = useMemo(
    () => reseedConfirmationText.trim(),
    [reseedConfirmationText],
  );
  const confirmationMatches = normalizedConfirmationText === RESEED_CONFIRMATION_PHRASE;

  const resetReseedAuth = () => {
    setReseedConfirmationText('');
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
    if (!confirmationMatches) {
      setReseedAuthError(`Type "${RESEED_CONFIRMATION_PHRASE}" exactly before reseeding.`);
      return;
    }

    setReseeding(true);
    try {
      const result = await dataApi.reseed(normalizedConfirmationText);
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
        title="Reset Database to Seed State?"
        size="md"
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
              disabled={reseeding || !confirmationMatches}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reseeding ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {reseeding ? 'Reseeding...' : 'I understand, reset data'}
            </button>
          </>
        )}
      >
        <form
          id="reseed-auth-form"
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleReseed();
          }}
        >
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-rose-100 p-2">
                <AlertTriangle className="h-4 w-4 text-rose-700" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-rose-900">
                  This action permanently replaces current data with seed data.
                </p>
                <p className="text-xs text-rose-800/90">
                  Users, classes, exams, and submissions will be wiped. This cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Type to confirm</div>
              <p className="text-xs text-gray-500">
                Enter the exact phrase below to enable reset.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <code className="text-xs font-semibold tracking-wide text-gray-700">
                {RESEED_CONFIRMATION_PHRASE}
              </code>
              <CopyButton text={RESEED_CONFIRMATION_PHRASE} />
            </div>

            <input
              value={reseedConfirmationText}
              onChange={(event) => {
                setReseedConfirmationText(event.target.value);
                if (reseedAuthError) {
                  setReseedAuthError('');
                }
              }}
              placeholder={RESEED_CONFIRMATION_PHRASE}
              autoComplete="off"
              spellCheck={false}
              className={`w-full rounded-xl border bg-white px-3 py-2 text-sm font-mono text-gray-900 transition-colors focus:outline-none focus:ring-2 ${
                reseedAuthError
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-gray-300 focus:ring-rose-500'
              }`}
            />

            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              confirmationMatches ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
            }`}
            >
              <CheckCircle2 className={`h-3.5 w-3.5 ${confirmationMatches ? 'text-emerald-600' : 'text-amber-700'}`} />
              {confirmationMatches ? 'Exact match confirmed. You can now reset.' : 'Waiting for exact, case-sensitive match.'}
            </div>
          </div>

          {reseedAuthError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {reseedAuthError}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            This confirmation is case-sensitive and must match exactly.
          </div>
        </form>
      </Modal>
    </div>
  );
}
