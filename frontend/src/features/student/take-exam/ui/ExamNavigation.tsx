import { ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import type { Exam } from '@/entities/exam';

interface ExamNavigationProps {
  currentQ: number;
  questions: Exam['questions'];
  answeredCount: number;
  lastSaved: Date | null;
  isAnswered: (questionId: string) => boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelectQuestion: (index: number) => void;
  onSubmit: () => void;
}

export function ExamNavigation({
  currentQ,
  questions,
  answeredCount,
  lastSaved,
  isAnswered,
  onPrevious,
  onNext,
  onSelectQuestion,
  onSubmit,
}: ExamNavigationProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onPrevious}
          disabled={currentQ === 0}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="md:hidden flex gap-1 overflow-x-auto max-w-[120px]">
          {questions.map((question, index) => (
            <button
              key={question.id}
              onClick={() => onSelectQuestion(index)}
              className={`flex-shrink-0 w-2 h-2 rounded-full transition-colors ${
                currentQ === index ? 'bg-gray-900' : isAnswered(question.id) ? 'bg-gray-400' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit Exam
          </button>
        )}
      </div>

      <button
        onClick={onSubmit}
        className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
      >
        <Send className="w-4 h-4" />
        Submit Exam ({answeredCount}/{questions.length} answered)
      </button>

      {lastSaved && (
        <div className="sm:hidden flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-2">
          <Save className="w-3 h-3" />
          Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </>
  );
}
