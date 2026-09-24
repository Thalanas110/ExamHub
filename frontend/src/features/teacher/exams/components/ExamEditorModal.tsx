import { PlusCircle } from 'lucide-react';
import { DateTimePicker } from '@/shared/ui/date-time-picker';
import { Modal } from '@/shared/ui/Modal';
import type { Class } from '@/entities/class';
import type { Exam, ExamStatus, Question } from '@/entities/exam';
import type { ExamFormData } from '../lib/exam-form';
import { QuestionEditorCard } from './QuestionEditorCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface ExamEditorModalProps {
  isOpen: boolean;
  editingExam: Exam | null;
  form: ExamFormData;
  classes: Class[];
  onClose: () => void;
  onSave: () => void;
  onChange: (updater: (current: ExamFormData) => ExamFormData) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (index: number) => void;
  onUpdateQuestion: (index: number, data: Partial<Question>) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
}

export function ExamEditorModal({
  isOpen,
  editingExam,
  form,
  classes,
  onClose,
  onSave,
  onChange,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onUpdateOption,
}: ExamEditorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExam ? 'Edit Exam' : 'Create New Exam'}
      size="xl"
      footer={(
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors">
            {editingExam ? 'Save Changes' : 'Create Exam'}
          </button>
        </>
      )}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={event => onChange(current => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Algebra Midterm Exam"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={event => onChange(current => ({ ...current, description: event.target.value }))}
                placeholder="Brief exam description..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <Select value={form.classId} onValueChange={value => onChange(current => ({ ...current, classId: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select value={form.status} onValueChange={value => onChange(current => ({ ...current, status: value as ExamStatus }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={event => onChange(current => ({ ...current, duration: +event.target.value }))}
                  min={5}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={form.totalMarks}
                  onChange={event => onChange(current => ({ ...current, totalMarks: +event.target.value }))}
                  min={1}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pass Marks</label>
                <input
                  type="number"
                  value={form.passingMarks}
                  onChange={event => onChange(current => ({ ...current, passingMarks: +event.target.value }))}
                  min={1}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <DateTimePicker
                  value={form.startDate}
                  min={editingExam ? undefined : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={val => onChange(current => ({ ...current, startDate: val }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                <DateTimePicker
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={val => onChange(current => ({ ...current, endDate: val }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Questions ({form.questions.length})</h3>
            <button onClick={onAddQuestion} className="flex items-center gap-1.5 text-gray-600 text-sm font-medium hover:text-gray-900">
              <PlusCircle className="w-4 h-4" /> Add Question
            </button>
          </div>
          <div className="space-y-4">
            {form.questions.map((question, index) => (
              <QuestionEditorCard
                key={question.id}
                index={index}
                question={question}
                onRemove={onRemoveQuestion}
                onUpdateQuestion={onUpdateQuestion}
                onUpdateOption={onUpdateOption}
              />
            ))}
            {form.questions.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No questions yet. Click "Add Question" to start.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
