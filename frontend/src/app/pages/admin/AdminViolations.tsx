import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Search, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminApi,
  violationApi,
  type AdminViolationDashboardResponse,
  type AdminViolationDashboardRow,
  type ViolationCase,
  type ViolationCaseOutcome,
  type ViolationCaseSeverity,
  type ViolationRecord,
} from '../../services/api';
import { Badge } from '@/shared/ui/Badge';
import { PaginatedTable } from '@/shared/ui/PaginatedTable';
import { StatCard } from '@/shared/ui/StatCard';
import { ReviewModal } from '@/features/teacher/violation-cases/ReviewModal';
import { OUTCOME_META, SEVERITY_META, violationTypeLabel } from '@/features/teacher/violation-cases/case-meta';

const emptyDashboard: AdminViolationDashboardResponse = {
  summary: {
    totalViolations: 0,
    impactedStudents: 0,
    autoSubmittedCount: 0,
    latestViolationAt: null,
    totalCases: 0,
    pendingCases: 0,
    elevatedCases: 0,
  },
  rows: [],
};

function formatDate(value: string | null): string {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}

function inferredSeverity(row: AdminViolationDashboardRow): ViolationCaseSeverity {
  if (row.severity) return row.severity;
  if (row.latestType === 'auto_submitted' || row.violationCount >= 4) return 'critical';
  if (row.violationCount >= 3) return 'high';
  if (row.violationCount === 2) return 'medium';
  return 'low';
}

function outcomeFor(row: AdminViolationDashboardRow): ViolationCaseOutcome {
  return row.outcome ?? 'pending';
}

function caseFromRow(row: AdminViolationDashboardRow): ViolationCase | null {
  if (!row.caseId || !row.severity || !row.outcome) {
    return null;
  }

  return {
    id: row.caseId,
    examId: row.examId,
    studentId: row.studentId,
    studentName: row.studentName,
    studentEmail: row.studentEmail ?? '',
    severity: row.severity,
    outcome: row.outcome,
    teacherNotes: row.teacherNotes,
    reviewedBy: row.reviewedBy,
    reviewerName: row.reviewerName,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
  };
}

export function AdminViolations() {
  const [data, setData] = useState<AdminViolationDashboardResponse>(emptyDashboard);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [reviewRow, setReviewRow] = useState<AdminViolationDashboardRow | null>(null);
  const [reviewViolations, setReviewViolations] = useState<ViolationRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await adminApi.getViolations());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load violation dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.rows;

    return data.rows.filter(row =>
      row.examTitle.toLowerCase().includes(needle) ||
      row.studentName.toLowerCase().includes(needle) ||
      (row.studentEmail ?? '').toLowerCase().includes(needle) ||
      (row.className ?? '').toLowerCase().includes(needle),
    );
  }, [data.rows, query]);

  const openReview = async (row: AdminViolationDashboardRow) => {
    setReviewRow(row);
    setReviewLoading(true);
    try {
      setReviewViolations(await violationApi.listByExam(row.examId));
    } catch (error) {
      setReviewRow(null);
      toast.error(error instanceof Error ? error.message : 'Failed to load violation details.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCaseSaved = () => {
    setReviewRow(null);
    setReviewViolations([]);
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            Violations Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">Admin-wide anti-cheat visibility across exams and students.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Violation Events" value={data.summary.totalViolations} icon={ShieldAlert} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard title="Impacted Students" value={data.summary.impactedStudents} icon={Users} />
        <StatCard title="Pending Cases" value={data.summary.pendingCases} icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600" />
        <StatCard title="Elevated Cases" value={data.summary.elevatedCases} icon={CheckCircle2} iconBg="bg-rose-50" iconColor="text-rose-600" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Violation Queue</h2>
            <p className="mt-1 text-xs text-gray-500">Latest event: {formatDate(data.summary.latestViolationAt)}</p>
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search exam, class, student..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <PaginatedTable
          items={filteredRows}
          colSpan={8}
          minWidthClassName="min-w-[1120px]"
          bodyClassName="divide-y divide-gray-100"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3 text-left font-medium">Student</th>
                <th className="px-5 py-3 text-left font-medium">Exam</th>
                <th className="px-5 py-3 text-left font-medium">Events</th>
                <th className="px-5 py-3 text-left font-medium">Latest Type</th>
                <th className="px-5 py-3 text-left font-medium">Suggested</th>
                <th className="px-5 py-3 text-left font-medium">Outcome</th>
                <th className="px-5 py-3 text-left font-medium">Last Seen</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
          )}
          emptyRow={<div className="px-5 py-12 text-center text-sm text-gray-400">No violations found.</div>}
          renderRow={row => {
            const severity = inferredSeverity(row);
            const outcome = outcomeFor(row);

            return (
              <tr key={`${row.examId}-${row.studentId}`} className="hover:bg-gray-50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{row.studentName}</div>
                  <div className="mt-0.5 text-xs text-gray-400">{row.studentEmail ?? row.studentId}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-gray-700">{row.examTitle}</div>
                  <div className="mt-0.5 text-xs text-gray-400">{row.className ?? 'Unassigned class'}</div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-amber-100 px-2 text-sm font-bold text-amber-700">
                    {row.violationCount}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{row.latestType ? violationTypeLabel(row.latestType) : 'n/a'}</td>
                <td className="px-5 py-4"><Badge variant={SEVERITY_META[severity].badgeVariant}>{SEVERITY_META[severity].label}</Badge></td>
                <td className="px-5 py-4"><Badge variant={OUTCOME_META[outcome].badgeVariant}>{OUTCOME_META[outcome].label}</Badge></td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">{formatDate(row.lastOccurredAt)}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => void openReview(row)}
                    disabled={reviewLoading}
                    className="rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                  >
                    Review
                  </button>
                </td>
              </tr>
            );
          }}
        />
      </div>

      {reviewLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          Loading violation details...
        </div>
      )}

      {reviewRow && !reviewLoading && (
        <ReviewModal
          examId={reviewRow.examId}
          studentId={reviewRow.studentId}
          studentName={reviewRow.studentName}
          existingCase={caseFromRow(reviewRow)}
          violations={reviewViolations}
          onSaved={handleCaseSaved}
          onClose={() => setReviewRow(null)}
        />
      )}
    </div>
  );
}
