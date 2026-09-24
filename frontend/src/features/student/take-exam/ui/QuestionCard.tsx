import { CheckCircle2, Flag } from 'lucide-react';
import type { Question } from '@/entities/exam';
import { OPTION_LETTERS } from '../model/constants';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  answer: string;
  isFlagged: boolean;
  wordCount: number;
  charCount: number;
  onToggleFlag: () => void;
  onAnswerChange: (value: string) => void;
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  answer,
  isFlagged,
  wordCount,
  charCount,
  onToggleFlag,
  onAnswerChange,
}: QuestionCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
            Q{questionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-gray-400 capitalize bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
            {question.type.replace('_', ' ')}
          </span>
          <span className="text-xs font-semibold bg-gray-900 text-white px-2.5 py-1 rounded-lg">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </span>
        </div>
        <button
          onClick={onToggleFlag}
          title={isFlagged ? 'Remove flag' : 'Flag for review'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
            isFlagged
              ? 'bg-gray-900 text-white'
              : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
        </button>
      </div>

      <div className="px-6 py-5">
        <p className="text-gray-900 text-base leading-relaxed mb-5 font-medium">{question.text}</p>

        {question.type === 'mcq' && question.options && (
          <div className="space-y-2.5">
            {question.options.map((option, index) => {
              const selected = answer === option;

              return (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                    selected
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={selected}
                    onChange={() => onAnswerChange(option)}
                  />
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {OPTION_LETTERS[index]}
                  </div>
                  <span className={`text-sm leading-relaxed ${selected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {option}
                  </span>
                  {selected && (
                    <CheckCircle2 className="w-4 h-4 text-gray-900 ml-auto flex-shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        )}

        {question.type === 'short_answer' && (
          <div>
            <textarea
              rows={4}
              placeholder="Type your answer here..."
              value={answer}
              onChange={event => onAnswerChange(event.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none transition-shadow leading-relaxed"
            />
            <div className="flex justify-end mt-1.5 gap-3 text-xs text-gray-400">
              <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
              <span>{charCount} {charCount === 1 ? 'char' : 'chars'}</span>
            </div>
          </div>
        )}

        {question.type === 'essay' && (
          <div>
            <textarea
              rows={10}
              placeholder="Write your detailed answer here..."
              value={answer}
              onChange={event => onAnswerChange(event.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none transition-shadow leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
              <span className="italic">Tip: Write clearly and structure your answer with key points.</span>
              <div className="flex gap-3">
                <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                <span>{charCount} chars</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
