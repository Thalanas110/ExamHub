import type { ExamStatus } from '@/entities/exam';
import type { ViolationRecord } from '@/entities/violation';

export type TeacherExamFilter = 'all' | ExamStatus;

export const TEACHER_EXAM_FILTERS: TeacherExamFilter[] = ['all', 'draft', 'published', 'completed'];

export const EXAM_STATUS_ACTIONS: Record<ExamStatus, string> = {
  draft: 'Publish',
  published: 'Complete',
  completed: 'Back to Draft',
};

export const getViolationBadgeClassName = (violationType: ViolationRecord['violation_type']) => {
  if (violationType === 'auto_submitted') {
    return 'bg-red-100 text-red-700';
  }

  if (violationType === 'window_blur') {
    return 'bg-orange-100 text-orange-700';
  }

  return 'bg-yellow-100 text-yellow-700';
};
