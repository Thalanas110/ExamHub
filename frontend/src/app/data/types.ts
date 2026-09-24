export type { UserRole, User } from '@/entities/user';
export type ExamStatus = 'draft' | 'published' | 'completed';
export type SubmissionStatus = 'submitted' | 'graded';
export type QuestionType = 'mcq' | 'short_answer' | 'essay';

export interface Class {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  studentIds: string[];
  code: string;
  createdAt: string;
  description?: string;
}

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
  // Accommodation fields — populated by the backend for student users
  extraTimeMinutes?: number;
  attemptLimit?: number;
  attemptsUsed?: number;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  accessibilityPreferences?: string[];
}

export interface Answer {
  questionId: string;
  answer: string;
  marksAwarded?: number;
}

export interface QuestionTelemetry {
  questionId: string;
  topic?: string | null;
  timeSpentSeconds: number;
  visitCount: number;
  answerChangeCount: number;
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  answers: Answer[];
  totalScore?: number;
  percentage?: number;
  grade?: string;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  status: SubmissionStatus;
  questionTelemetry?: QuestionTelemetry[];
}
