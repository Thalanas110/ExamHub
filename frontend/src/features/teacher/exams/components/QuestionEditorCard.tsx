import { PlusCircle, X } from 'lucide-react';
import type { Question } from '@/entities/exam';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface QuestionEditorCardProps {
  index: number;
  question: Question;
  onRemove: (index: number) => void;
  onUpdateQuestion: (index: number, data: Partial<Question>) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
}

export function QuestionEditorCard({
  index,
  question,
  onRemove,
  onUpdateQuestion,
  onUpdateOption,
}: QuestionEditorCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Question {index + 1}</span>
        <button onClick={() => onRemove(index)} className="text-gray-500 hover:text-gray-700">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        <textarea
          rows={2}
          value={question.text}
          onChange={event => onUpdateQuestion(index, { text: event.target.value })}
          placeholder="Question text..."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none bg-white"
        />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Topic <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={question.topic || ''}
            onChange={event => onUpdateQuestion(index, { topic: event.target.value })}
            placeholder="e.g. Arithmetic, Factoring, Newton's Laws"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
          <p className="mt-1 text-[11px] text-gray-400">Topic tags power weak-topic analytics for future attempts.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <Select
              value={question.type}
              onValueChange={value => onUpdateQuestion(index, {
                type: value as Question['type'],
                options: value === 'mcq' ? ['', '', '', ''] : undefined,
              })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Marks</label>
            <input
              type="number"
              value={question.marks}
              onChange={event => onUpdateQuestion(index, { marks: +event.target.value })}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            />
          </div>
        </div>
        {question.type === 'mcq' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-500">Options (select correct answer)</label>
            {(question.options || ['', '', '', '']).map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctAnswer === option && option !== ''}
                  onChange={() => option && onUpdateQuestion(index, { correctAnswer: option })}
                  className="w-3.5 h-3.5 text-gray-700"
                />
                <input
                  type="text"
                  value={option}
                  onChange={event => {
                    onUpdateOption(index, optionIndex, event.target.value);
                    if (question.correctAnswer === option) {
                      onUpdateQuestion(index, { correctAnswer: event.target.value });
                    }
                  }}
                  placeholder={`Option ${optionIndex + 1}`}
                  className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white ${
                    question.correctAnswer === option ? 'border-gray-900' : 'border-gray-300'
                  }`}
                />
              </div>
            ))}
          </div>
        )}
        {question.type === 'short_answer' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Expected Answer (optional)</label>
            <input
              type="text"
              value={question.correctAnswer || ''}
              onChange={event => onUpdateQuestion(index, { correctAnswer: event.target.value })}
              placeholder="Model answer for reference..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
