import { BookOpen, ChevronDown, ChevronUp, Clock, Edit2, FileText, ShieldAlert, Trash2, UserCog } from 'lucide-react';
import { Badge, getStatusBadge } from '@/widgets/layouts/Badge';
import type { Class, Exam, ExamStatus, Submission } from '../../../../data/types';
import { EXAM_STATUS_ACTIONS } from '../constants';

interface ExamCardProps {
  exam: Exam;
  examClass: Class | undefined;
  submissions: Submission[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenAccommodations: () => void;
  onOpenViolations: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export function ExamCard({
  exam,
  examClass,
  submissions,
  isExpanded,
  onToggleExpand,
  onOpenAccommodations,
  onOpenViolations,
  onEdit,
  onDelete,
  onToggleStatus,
}: ExamCardProps) {
  const gradedSubmissions = submissions.filter(submission => submission.status === 'graded');
  const averageScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, submission) => sum + (submission.percentage || 0), 0) / gradedSubmissions.length)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-900">{exam.title}</h3>
              <div className="text-xs text-gray-400 mt-0.5">{examClass?.name} · {examClass?.subject}</div>
            </div>
            <Badge variant={getStatusBadge(exam.status)} className="flex-shrink-0">{exam.status}</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{exam.description}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.duration} min</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {exam.questions.length} questions</span>
            <span className="flex items-center gap-1">📝 {exam.totalMarks} marks</span>
            <span className="flex items-center gap-1">👥 {submissions.length} submissions</span>
            {averageScore !== null && <span className="flex items-center gap-1">📊 Avg: {averageScore}%</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onToggleExpand} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenAccommodations}
            title="Manage accommodations"
            className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
          >
            <UserCog className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenViolations}
            title="View anti-cheat violations"
            className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">Exam Details</div>
            <button onClick={onToggleStatus} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 font-medium">
              {EXAM_STATUS_ACTIONS[exam.status as ExamStatus]}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><span className="text-gray-400">Start:</span> <span className="font-medium">{new Date(exam.startDate).toLocaleString()}</span></div>
            <div><span className="text-gray-400">End:</span> <span className="font-medium">{new Date(exam.endDate).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Pass Mark:</span> <span className="font-medium">{exam.passingMarks}/{exam.totalMarks}</span></div>
            <div><span className="text-gray-400">Submissions:</span> <span className="font-medium">{submissions.length}</span></div>
            <div><span className="text-gray-400">Graded:</span> <span className="font-medium">{gradedSubmissions.length}</span></div>
            <div><span className="text-gray-400">Pending:</span> <span className="font-medium">{submissions.filter(submission => submission.status === 'submitted').length}</span></div>
          </div>
          {exam.questions.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-gray-500 mb-2">Questions</div>
              <div className="space-y-1">
                {exam.questions.map((question, index) => (
                  <div key={question.id} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5 font-medium text-gray-500 flex-shrink-0">Q{index + 1}</span>
                    <span className="line-clamp-1">{question.text}</span>
                    <span className="flex-shrink-0 text-gray-400">({question.marks} marks · {question.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
