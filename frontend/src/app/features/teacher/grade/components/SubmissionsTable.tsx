import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { Badge, getGradeBadge, getStatusBadge } from '@/widgets/layouts/Badge';
import { PaginatedTable } from '@/widgets/layouts/PaginatedTable';
import type { Exam, Submission, User } from '../../../../data/types';

interface SubmissionsTableProps {
  submissions: Submission[];
  exams: Exam[];
  getUserById: (id: string) => User | undefined;
  pendingCount: number;
  filter: 'all' | 'pending' | 'graded';
  onOpenViolations: (examId: string, studentId: string, examTitle: string, studentName: string) => void;
  onOpenGrade: (submission: Submission, exam: Exam) => void;
}

export function SubmissionsTable({
  submissions,
  exams,
  getUserById,
  pendingCount,
  filter,
  onOpenViolations,
  onOpenGrade,
}: SubmissionsTableProps) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <CheckCircle2 className="w-10 h-10 mx-auto text-gray-200 mb-3" />
        <div className="text-gray-500 font-medium">{filter === 'pending' ? 'No pending submissions' : 'No submissions found'}</div>
        <div className="text-gray-400 text-sm mt-1">{filter === 'pending' ? 'All caught up!' : 'Submissions appear here once students submit their exams'}</div>
      </div>
    );
  }

  return (
    <>
      {pendingCount > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-gray-700 text-sm font-medium">{pendingCount} submission{pendingCount > 1 ? 's' : ''} awaiting your review</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <PaginatedTable
          items={submissions}
          colSpan={6}
          minWidthClassName="min-w-[860px]"
          bodyClassName="divide-y divide-gray-50"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Student</th>
                <th className="px-5 py-3 text-left font-medium">Exam</th>
                <th className="px-5 py-3 text-left font-medium">Submitted</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Score</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
          )}
          emptyRow={<div className="px-5 py-12 text-center text-gray-400 text-sm">No submissions found</div>}
          renderRow={submission => {
              const student = getUserById(submission.studentId);
              const exam = exams.find(item => item.id === submission.examId);

              return (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {student?.name[0] || '?'}
                      </div>
                      <span className="font-medium text-gray-900">{student?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{exam?.title || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400">{new Date(submission.submittedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5"><Badge variant={getStatusBadge(submission.status)}>{submission.status}</Badge></td>
                  <td className="px-5 py-3.5">
                    {submission.status === 'graded' ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{submission.percentage}%</span>
                        <Badge variant={getGradeBadge(submission.grade)}>{submission.grade}</Badge>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {exam && student && (
                        <button
                          onClick={() => onOpenViolations(exam.id, submission.studentId, exam.title, student.name)}
                          title="View anti-cheat violations"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}
                      {exam && (
                        <button
                          onClick={() => onOpenGrade(submission, exam)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            submission.status === 'submitted' ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {submission.status === 'submitted' ? 'Grade' : 'Review'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
          }}
        />
      </div>
    </>
  );
}
