import { AlertTriangle, ShieldAlert, UserCog } from 'lucide-react';
import type { Exam } from '@/entities/exam';
import { MAX_TAB_SWITCHES } from '../model/constants';

interface ExamStartScreenProps {
  exam: Exam;
  classNameText?: string;
  onCancel: () => void;
  onStart: () => void;
}

export function ExamStartScreen({
  exam,
  classNameText,
  onCancel,
  onStart,
}: ExamStartScreenProps) {
  const effectiveDuration = exam.duration + (exam.extraTimeMinutes ?? 0);
  const hasAccommodations = (exam.extraTimeMinutes ?? 0) > 0
    || (exam.attemptLimit ?? 1) > 1
    || !!exam.effectiveStartDate
    || (exam.accessibilityPreferences ?? []).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg w-full shadow-sm">
        <div className="mb-6">
          <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{classNameText}</div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">{exam.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Duration', value: `${effectiveDuration} min${(exam.extraTimeMinutes ?? 0) > 0 ? ` (+${exam.extraTimeMinutes})` : ''}` },
            { label: 'Total Marks', value: exam.totalMarks },
            { label: 'Questions', value: exam.questions.length },
            { label: 'Pass Mark', value: exam.passingMarks },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">{item.label}</div>
              <div className="text-sm font-bold text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>

        {hasAccommodations && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3 flex items-start gap-3">
            <UserCog className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Accommodations Applied</p>
              <ul className="text-sm text-blue-700 space-y-0.5">
                {(exam.extraTimeMinutes ?? 0) > 0 && (
                  <li>+{exam.extraTimeMinutes} min extra time (effective duration: {effectiveDuration} min)</li>
                )}
                {(exam.attemptLimit ?? 1) > 1 && (
                  <li>Up to {exam.attemptLimit} attempts ({exam.attemptsUsed ?? 0} used)</li>
                )}
                {exam.effectiveStartDate && exam.effectiveEndDate && (
                  <li>Alternate window: {new Date(exam.effectiveStartDate).toLocaleString()} &ndash; {new Date(exam.effectiveEndDate).toLocaleString()}</li>
                )}
                {(exam.accessibilityPreferences ?? []).map(preference => (
                  <li key={preference}>{preference.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Important:</strong> Once started, the timer cannot be paused. Ensure you have a stable connection and enough time before beginning.
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 leading-relaxed">
            <strong className="text-red-900">Anti-Cheat Policy:</strong> Switching tabs, minimising the window, or leaving this page will be recorded as a violation. After {MAX_TAB_SWITCHES} violation(s) your exam will be automatically submitted.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
