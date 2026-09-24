import { ChevronRight, Send, ShieldAlert } from 'lucide-react';
import type { Exam } from '@/entities/exam';
import type { Submission } from '@/entities/submission';
import type { User } from '@/entities/user';

interface GradeSubmissionViewProps {
  submission: Submission;
  exam: Exam;
  student: User;
  gradeInputs: Record<string, number>;
  feedback: string;
  totalScore: number;
  submittingGrade: boolean;
  onBack: () => void;
  onOpenViolations: () => void;
  onGradeInputChange: (questionId: string, value: number, maxMarks: number) => void;
  onFeedbackChange: (value: string) => void;
  onSubmit: () => void;
}

export function GradeSubmissionView({
  submission,
  exam,
  student,
  gradeInputs,
  feedback,
  totalScore,
  submittingGrade,
  onBack,
  onOpenViolations,
  onGradeInputChange,
  onFeedbackChange,
  onSubmit,
}: GradeSubmissionViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Grade Submission</h1>
          <p className="text-gray-400 text-sm">{student.name} · {exam.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Student', value: student.name },
          { label: 'Exam', value: exam.title },
          { label: 'Submitted', value: new Date(submission.submittedAt).toLocaleDateString() },
          { label: 'Total Marks', value: exam.totalMarks },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</div>
            <div className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{item.value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onOpenViolations}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100 transition-colors w-fit"
      >
        <ShieldAlert className="w-4 h-4" />
        View Anti-Cheat Violations for this Student
      </button>

      <div className="space-y-4">
        {exam.questions.map((question, index) => {
          const answer = submission.answers.find(item => item.questionId === question.id);
          const isCorrect = question.type === 'mcq' && answer?.answer === question.correctAnswer;

          return (
            <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5">Q{index + 1}</span>
                  <p className="text-sm text-gray-800 font-medium">{question.text}</p>
                </div>
                <div className="flex-shrink-0">
                  {question.type === 'mcq' ? (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${isCorrect ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {isCorrect ? '✓' : '✕'} {isCorrect ? question.marks : 0}/{question.marks}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={question.marks}
                        value={gradeInputs[question.id] ?? ''}
                        onChange={event => onGradeInputChange(question.id, +event.target.value, question.marks)}
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900 font-semibold"
                      />
                      <span className="text-xs text-gray-400">/ {question.marks}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                <div className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Student's Answer</div>
                <div className="text-gray-800 whitespace-pre-wrap">{answer?.answer || <span className="italic text-gray-300">No answer</span>}</div>
              </div>

              {question.type === 'mcq' && question.correctAnswer && (
                <div className="mt-2 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <strong>Correct:</strong> {question.correctAnswer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Total Score Preview</span>
        <span className="text-lg font-bold text-gray-900">
          {totalScore} / {exam.totalMarks}
          <span className="text-sm font-normal text-gray-400 ml-2">
            ({Math.round((totalScore / exam.totalMarks) * 100)}%)
          </span>
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Teacher Feedback</label>
        <textarea
          rows={3}
          value={feedback}
          onChange={event => onFeedbackChange(event.target.value)}
          placeholder="Provide feedback for the student…"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onBack} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button
          onClick={onSubmit}
          disabled={submittingGrade}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-60 transition-colors"
        >
          {submittingGrade ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Grade
        </button>
      </div>
    </div>
  );
}
