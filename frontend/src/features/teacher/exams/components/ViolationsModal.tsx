import { Modal } from '@/shared/ui/Modal';
import type { Exam } from '@/entities/exam';
import type { ViolationRecord } from '@/entities/violation';
import { getViolationBadgeClassName } from '../constants';
import { ShieldAlert } from 'lucide-react';

interface ViolationsModalProps {
  exam: Exam | null;
  violations: ViolationRecord[];
  loading: boolean;
  onClose: () => void;
}

export function ViolationsModal({
  exam,
  violations,
  loading,
  onClose,
}: ViolationsModalProps) {
  return (
    <Modal
      isOpen={!!exam}
      onClose={onClose}
      title={`Anti-Cheat Violations — ${exam?.title ?? ''}`}
      size="xl"
    >
      <div>
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading violations…</div>
        ) : violations.length === 0 ? (
          <div className="py-10 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <div className="text-gray-500 font-medium">No violations recorded</div>
            <div className="text-gray-400 text-sm mt-1">All students behaved during this exam.</div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {violations.length} violation event(s) recorded across{' '}
              {new Set(violations.map(violation => violation.student_id)).size} student(s).
            </p>
            <div className="data-table-scroll overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[760px] text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Student ID</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Violation #</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Details</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Occurred At</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((violation, index) => (
                    <tr key={violation.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-700 truncate max-w-[120px]" title={violation.student_id}>
                        {violation.student_id.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                          {violation.violation_no}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${getViolationBadgeClassName(violation.violation_type)}`}>
                          {violation.violation_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 truncate max-w-[200px]">{violation.details ?? '—'}</td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                        {new Date(violation.occurred_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
