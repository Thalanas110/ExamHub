export type ExamStatus = 'draft' | 'published' | 'completed';
export type QuestionType = 'mcq' | 'short_answer' | 'essay';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  topic?: string | null;
  options?: string[];
  correctAnswer?: string;
  marks: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  classId: string;
  teacherId: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startDate: string;
  endDate: string;
  status: ExamStatus;
  questions: Question[];
  createdAt: string;
  extraTimeMinutes?: number;
  attemptLimit?: number;
  attemptsUsed?: number;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  accessibilityPreferences?: string[];
}
