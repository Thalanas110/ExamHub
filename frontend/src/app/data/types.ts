export type { UserRole, User } from '@/entities/user';
export type { Class } from '@/entities/class';
export type { Exam, ExamStatus, Question, QuestionType } from '@/entities/exam';
export type SubmissionStatus = 'submitted' | 'graded';

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
