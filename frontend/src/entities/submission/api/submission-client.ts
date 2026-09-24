import { request } from '@/shared/api/request';

export interface SubmitResultPayload {
  examId: string;
  answers: { questionId: string; answer: string }[];
  submittedAt: string;
  questionTelemetry?: {
    questionId: string;
    topic?: string | null;
    timeSpentSeconds: number;
    visitCount: number;
    answerChangeCount: number;
  }[];
  id?: string;
}

export interface ResultResponse {
  id: string;
  examId: string;
  studentId: string;
  answers: { questionId: string; answer: string; marksAwarded?: number }[];
  totalScore?: number;
  percentage?: number;
  grade?: string;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  status: 'submitted' | 'graded';
}

export const resultApi = {
  submit: (payload: SubmitResultPayload) =>
    request<ResultResponse>('POST', '/results/submit', payload, true),

  getByStudent: (studentId: string) =>
    request<ResultResponse[]>('GET', `/results/student/${studentId}`, undefined, true),

  grade: (id: string, grades: { questionId: string; marksAwarded: number }[], feedback: string) =>
    request<ResultResponse>('PUT', `/results/${id}/grade`, { grades, feedback }, true),
};
