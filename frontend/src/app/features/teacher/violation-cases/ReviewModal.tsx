import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../../components/shared/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  violationCaseApi,
  type ViolationCase,
  type ViolationCaseOutcome,
  type ViolationCaseSeverity,
  type ViolationRecord,
} from '../../../services/api';
import {
  OUTCOME_META,
  SEVERITY_META,
  suggestSeverity,
  violationTypeLabel,
} from './case-meta';

interface ReviewModalProps {
  examId: string;
  studentId: string;
  studentName: string;
  existingCase: ViolationCase | null;
  violations: ViolationRecord[];
  onSaved: (savedCase: ViolationCase) => void;
  onClose: () => void;
}

export function ReviewModal({
  examId,
  studentId,
  studentName,
  existingCase,
  violations,
  onSaved,
  onClose,
}: ReviewModalProps) {
  const suggested = suggestSeverity(violations);
  const [severity, setSeverity] = useState<ViolationCaseSeverity>(existingCase?.severity ?? suggested);
  const [outcome, setOutcome] = useState<ViolationCaseOutcome>(existingCase?.outcome ?? 'pending');
  const [notes, setNotes] = useState(existingCase?.teacherNotes ?? '');
  const [saving, setSaving] = useState(false);

  const studentViolations = violations.filter(
    violation => violation.exam_id === examId && violation.student_id === studentId,
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const savedCase = await violationCaseApi.upsert(examId, studentId, {
        id: existingCase?.id,
        severity,
        outcome,
        notes: notes.trim() || undefined,
      });
      toast.success('Case decision saved.');
      onSaved(savedCase);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save case.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Review Case - ${studentName}`}
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Decision'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Raw Violations ({studentViolations.length})
          </p>
          {studentViolations.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No violation events recorded.</p>
          ) : (
            <div className="data-table-scroll overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[620px] text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Details</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Occurred</th>
                  </tr>
                </thead>
                <tbody>
                  {studentViolations.map(violation => (
                    <tr key={violation.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-center">
                        <span className="bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded-full">
                          {violation.violation_no}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-700">
                        {violationTypeLabel(violation.violation_type)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{violation.details ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{violation.occurred_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Severity
              {!existingCase && (
                <span className="ml-1.5 text-gray-400 font-normal normal-case">
                  (suggested: {SEVERITY_META[suggested].label})
                </span>
              )}
            </label>
            <Select value={severity} onValueChange={value => setSeverity(value as ViolationCaseSeverity)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEVERITY_META) as ViolationCaseSeverity[]).map(value => (
                  <SelectItem key={value} value={value}>{SEVERITY_META[value].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Outcome</label>
            <Select value={outcome} onValueChange={value => setOutcome(value as ViolationCaseOutcome)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OUTCOME_META) as ViolationCaseOutcome[]).map(value => (
                  <SelectItem key={value} value={value}>{OUTCOME_META[value].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reviewer Notes</label>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional notes about this case decision..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400"
          />
        </div>

        {existingCase?.reviewedAt && (
          <p className="text-xs text-gray-400">
            Last reviewed by{' '}
            <span className="font-medium text-gray-600">{existingCase.reviewerName ?? 'Unknown'}</span>
            {' '}on {existingCase.reviewedAt}
          </p>
        )}
      </div>
    </Modal>
  );
}

