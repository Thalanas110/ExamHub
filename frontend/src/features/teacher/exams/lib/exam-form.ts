import type { Exam, Question } from '@/entities/exam';

export type ExamFormData = Omit<Exam, 'id' | 'createdAt' | 'teacherId'>;

export const createBlankQuestion = (): Question => ({
  id: Math.random().toString(36).substr(2, 9),
  text: '',
  type: 'mcq',
  topic: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  marks: 10,
});

export const createInitialExamForm = (classId = ''): ExamFormData => ({
  title: '',
  description: '',
  classId,
  duration: 60,
  totalMarks: 100,
  passingMarks: 50,
  startDate: '',
  endDate: '',
  status: 'draft',
  questions: [createBlankQuestion()],
});

export const createEditableExamForm = (exam: Exam): ExamFormData => ({
  title: exam.title,
  description: exam.description,
  classId: exam.classId,
  duration: exam.duration,
  totalMarks: exam.totalMarks,
  passingMarks: exam.passingMarks,
  startDate: exam.startDate.slice(0, 16),
  endDate: exam.endDate.slice(0, 16),
  status: exam.status,
  questions: exam.questions,
});

const toTimestamp = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const validateExamForm = (form: ExamFormData, isNew = false): string | null => {
  if (!form.title.trim() || !form.description.trim() || !form.classId.trim()) {
    return 'title, description, and class are required.';
  }

  if (form.duration <= 0) {
    return 'Duration must be greater than zero.';
  }

  if (form.totalMarks <= 0) {
    return 'Total marks must be greater than zero.';
  }

  if (form.passingMarks <= 0) {
    return 'Pass marks must be greater than zero.';
  }

  if (form.passingMarks > form.totalMarks) {
    return 'Pass marks cannot be greater than total marks.';
  }

  const startTimestamp = toTimestamp(form.startDate);
  const endTimestamp = toTimestamp(form.endDate);
  if (startTimestamp === null || endTimestamp === null) {
    return 'Start and end date/time are required.';
  }

  if (isNew && startTimestamp < Date.now()) {
    return 'Start date/time cannot be in the past.';
  }

  if (endTimestamp <= startTimestamp) {
    return 'End date/time must be later than start date/time.';
  }

  if (form.questions.length === 0) {
    return 'At least one question is required.';
  }

  let allocatedMarks = 0;
  for (let index = 0; index < form.questions.length; index += 1) {
    const question = form.questions[index];
    const label = `Question ${index + 1}`;

    if (!question.text.trim()) {
      return `${label} text is required.`;
    }

    if ((question.marks ?? 0) <= 0) {
      return `${label} marks must be greater than zero.`;
    }

    allocatedMarks += question.marks;

    if (question.type === 'mcq') {
      const options = (question.options ?? []).map(option => option.trim()).filter(option => option !== '');
      if (options.length < 2) {
        return `${label} must have at least 2 options.`;
      }

      const correctAnswer = (question.correctAnswer ?? '').trim();
      if (correctAnswer === '') {
        return `${label} must have a correct answer.`;
      }

      if (!options.includes(correctAnswer)) {
        return `${label} correct answer must match one of the options.`;
      }
    }
  }

  if (allocatedMarks < form.totalMarks) {
    return `Not enough points in questions. Total marks is ${form.totalMarks} but only ${allocatedMarks} point(s) are assigned.`;
  }

  if (allocatedMarks > form.totalMarks) {
    return `Question points exceed total marks. Total marks is ${form.totalMarks} but ${allocatedMarks} point(s) are assigned.`;
  }

  return null;
};
