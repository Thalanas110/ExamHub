import { BarChart2, BookOpen } from 'lucide-react';
import type { Exam } from '@/entities/exam';
import { getQuestionButtonClassName } from '../lib/session';

interface QuestionNavigatorProps {
  questions: Exam['questions'];
  currentQ: number;
  answeredCount: number;
  progressPct: number;
  isAnswered: (questionId: string) => boolean;
  isFlagged: (questionId: string) => boolean;
  onSelectQuestion: (index: number) => void;
}

export function QuestionNavigator({
  questions,
  currentQ,
  answeredCount,
  progressPct,
  isAnswered,
  isFlagged,
  onSelectQuestion,
}: QuestionNavigatorProps) {
  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <BookOpen className="w-3.5 h-3.5" />
          Questions
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {questions.map((question, index) => (
            <button
              key={question.id}
              onClick={() => onSelectQuestion(index)}
              title={`Question ${index + 1}${isAnswered(question.id) ? ' (answered)' : ''}${isFlagged(question.id) ? ' (flagged)' : ''}`}
              className={getQuestionButtonClassName(index, currentQ, isAnswered(question.id), isFlagged(question.id))}
            >
              {index + 1}
              {isFlagged(question.id) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gray-500 rounded-full border border-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Legend</div>
        {[
          { swatch: 'bg-gray-900', label: 'Current' },
          { swatch: 'bg-gray-200', label: 'Answered' },
          { swatch: 'bg-white border-2 border-gray-400', label: 'Flagged' },
          { swatch: 'bg-gray-100 border border-gray-200', label: 'Unanswered' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${item.swatch} flex-shrink-0`} />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          <BarChart2 className="w-3.5 h-3.5" />
          Progress
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Answered</span>
            <span className="font-semibold text-gray-900">{answeredCount}/{questions.length}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Unanswered</span>
            <span className="font-semibold text-gray-900">{questions.length - answeredCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
