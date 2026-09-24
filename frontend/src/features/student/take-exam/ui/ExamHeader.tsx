import { Clock, Save, Send, ShieldAlert } from 'lucide-react';
import { MAX_TAB_SWITCHES } from '../model/constants';
import { formatCountdown } from '../lib/session';

interface ExamHeaderProps {
  examTitle: string;
  classNameText?: string;
  answeredCount: number;
  totalQuestions: number;
  flaggedCount: number;
  tabSwitchCount: number;
  lastSaved: Date | null;
  timeLeft: number;
  isUrgent: boolean;
  isVeryUrgent: boolean;
  onSubmit: () => void;
}

export function ExamHeader({
  examTitle,
  classNameText,
  answeredCount,
  totalQuestions,
  flaggedCount,
  tabSwitchCount,
  lastSaved,
  timeLeft,
  isUrgent,
  isVeryUrgent,
  onSubmit,
}: ExamHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-gray-900 transition-all duration-500"
          style={{ width: `${Math.round((answeredCount / totalQuestions) * 100)}%` }}
        />
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{examTitle}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{classNameText}</span>
            <span className="text-gray-300">&middot;</span>
            <span className="text-xs text-gray-500">{answeredCount}/{totalQuestions} answered</span>
            {flaggedCount > 0 && (
              <>
                <span className="text-gray-300">&middot;</span>
                <span className="text-xs text-gray-500">{flaggedCount} flagged</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{tabSwitchCount}/{MAX_TAB_SWITCHES} violations</span>
            </div>
          )}

          {lastSaved && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Save className="w-3 h-3" />
              <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-sm font-bold transition-all ${
              isVeryUrgent
                ? 'bg-gray-900 text-white animate-pulse'
                : isUrgent
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            {formatCountdown(timeLeft)}
          </div>

          <button
            onClick={onSubmit}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
