import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ExamAccommodationsModal } from '../../components/shared/ExamAccommodationsModal';
import { ConfirmDialog } from '@/widgets/layouts/Modal';
import { useApp } from '@/app/providers/AppProvider';
import { toast } from 'sonner';
import type { Exam, ExamStatus, Question } from '@/entities/exam';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ExamCard } from '@/features/teacher/exams/components/ExamCard';
import { ExamEditorModal } from '@/features/teacher/exams/components/ExamEditorModal';
import { EmptyExamsState } from '@/features/teacher/exams/components/EmptyExamsState';
import { ExamFilterTabs } from '@/features/teacher/exams/components/ExamFilterTabs';
import { ViolationsModal } from '@/features/teacher/exams/components/ViolationsModal';
import type { TeacherExamFilter } from '@/features/teacher/exams/constants';
import { createBlankQuestion, createEditableExamForm, createInitialExamForm, type ExamFormData, validateExamForm } from '@/features/teacher/exams/lib/exam-form';
import { useExamViolations } from '@/features/teacher/exams/hooks/useExamViolations';

export function TeacherExams() {
  const {
    currentUser,
    classes,
    exams,
    users,
    addExam,
    updateExam,
    deleteExam,
    getSubmissionsByExam,
  } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeacherExamFilter>('all');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [accommodationsExam, setAccommodationsExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<ExamFormData>(createInitialExamForm());
  const {
    violationsExam,
    violations,
    violationsLoading,
    openViolations,
    closeViolations,
  } = useExamViolations();

  if (!currentUser) return null;

  const myClasses = classes.filter(item => item.teacherId === currentUser.id);
  const myExams = exams
    .filter(item => item.teacherId === currentUser.id)
    .filter(item => filter === 'all' || item.status === filter)
    .filter(item => classFilter === 'all' || item.classId === classFilter)
    .filter(item => {
      const query = search.trim().toLowerCase();
      const examClass = classes.find(cls => cls.id === item.classId);
      return query === ''
        || item.title.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query)
        || (examClass?.name.toLowerCase().includes(query) ?? false)
        || (examClass?.subject.toLowerCase().includes(query) ?? false);
    });

  const openCreate = () => {
    setEditingExam(null);
    setForm(createInitialExamForm(myClasses[0]?.id || ''));
    setShowModal(true);
  };

  const openEdit = (exam: Exam) => {
    setEditingExam(exam);
    setForm(createEditableExamForm(exam));
    setShowModal(true);
  };

  const handleSave = async () => {
    const validationError = validateExamForm(form, !editingExam);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      if (editingExam) {
        await updateExam(editingExam.id, { ...form, teacherId: currentUser.id });
        toast.success('Exam updated successfully');
      } else {
        await addExam({ ...form, teacherId: currentUser.id });
        toast.success('Exam created successfully');
      }
      setShowModal(false);
    } catch (error) {
      const message = error instanceof Error && error.message.trim() !== ''
        ? error.message
        : 'Unable to save exam.';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExam(id);
      toast.success('Exam deleted');
    } catch (error) {
      const message = error instanceof Error && error.message.trim() !== ''
        ? error.message
        : 'Unable to delete exam.';
      toast.error(message);
    }
  };

  const toggleStatus = async (exam: Exam) => {
    const next: ExamStatus = exam.status === 'draft'
      ? 'published'
      : exam.status === 'published'
      ? 'completed'
      : 'draft';

    try {
      await updateExam(exam.id, { status: next });
      toast.success(`Exam status changed to ${next}`);
    } catch (error) {
      const message = error instanceof Error && error.message.trim() !== ''
        ? error.message
        : 'Unable to update exam status.';
      toast.error(message);
    }
  };

  const updateForm = (updater: (current: ExamFormData) => ExamFormData) => {
    setForm(current => updater(current));
  };

  const addQuestion = () => {
    updateForm(current => ({ ...current, questions: [...current.questions, createBlankQuestion()] }));
  };

  const removeQuestion = (index: number) => {
    updateForm(current => ({
      ...current,
      questions: current.questions.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const updateQuestion = (index: number, data: Partial<Question>) => {
    updateForm(current => ({
      ...current,
      questions: current.questions.map((question, currentIndex) => (
        currentIndex === index ? { ...question, ...data } : question
      )),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    updateForm(current => ({
      ...current,
      questions: current.questions.map((question, currentIndex) => (
        currentIndex === questionIndex
          ? { ...question, options: (question.options || []).map((option, currentOptionIndex) => (
              currentOptionIndex === optionIndex ? value : option
            )) }
          : question
      )),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Create and manage exams for your classes</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>

      <ExamFilterTabs filter={filter} onChange={setFilter} />

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {myClasses.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams, classes, subjects..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {myExams.length === 0 ? (
        <EmptyExamsState onCreate={openCreate} />
      ) : (
        <div className="space-y-3">
          {myExams.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              examClass={classes.find(item => item.id === exam.classId)}
              submissions={getSubmissionsByExam(exam.id)}
              isExpanded={expandedExam === exam.id}
              onToggleExpand={() => setExpandedExam(current => current === exam.id ? null : exam.id)}
              onOpenAccommodations={() => setAccommodationsExam(exam)}
              onOpenViolations={() => openViolations(exam)}
              onEdit={() => openEdit(exam)}
              onDelete={() => setDeleteTarget(exam.id)}
              onToggleStatus={() => toggleStatus(exam)}
            />
          ))}
        </div>
      )}

      <ExamEditorModal
        isOpen={showModal}
        editingExam={editingExam}
        form={form}
        classes={myClasses}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        onChange={updateForm}
        onAddQuestion={addQuestion}
        onRemoveQuestion={removeQuestion}
        onUpdateQuestion={updateQuestion}
        onUpdateOption={updateOption}
      />

      <ExamAccommodationsModal
        exam={accommodationsExam}
        classes={classes}
        users={users}
        onClose={() => setAccommodationsExam(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDelete(deleteTarget);
          }
          setDeleteTarget(null);
        }}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? All submissions will also be removed. This action cannot be undone."
        confirmLabel="Delete Exam"
      />

      <ViolationsModal
        exam={violationsExam}
        violations={violations}
        loading={violationsLoading}
        onClose={closeViolations}
      />
    </div>
  );
}
