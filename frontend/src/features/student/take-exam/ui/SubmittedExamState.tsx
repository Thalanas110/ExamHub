import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Exam } from '@/entities/exam';
import type { Submission } from '@/entities/submission';

interface SubmittedExamStateProps {
  exam: Exam;
  submission?: Submission;
  submitted: boolean;
  onBackToExams: () => void;
  onViewResults: () => void;
}

export function SubmittedExamState({
  exam,
  submission,
  submitted,
  onBackToExams,
  onViewResults,
}: SubmittedExamStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {submission && !submitted ? 'Already Submitted' : 'Exam Submitted!'}
        </h2>
        <p className="text-gray-500 mb-2 text-sm">{exam.title}</p>
        {submission?.status === 'graded' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-5">
            <div className="text-2xl font-bold text-gray-900">{submission.grade}</div>
            <div className="text-gray-500 text-sm mt-1">{submission.totalScore}/{exam.totalMarks} marks &middot; {submission.percentage}%</div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <p className="text-gray-600 text-sm text-left">Awaiting grading by your teacher.</p>
          </div>
        )}
        <button
          onClick={onBackToExams}
          className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Back to Exams
        </button>
        <button
          onClick={onViewResults}
          className="w-full mt-2 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          View Results
        </button>
      </div>
    </div>
  );
}
