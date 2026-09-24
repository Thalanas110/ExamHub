import { request } from '@/shared/api/request';

export interface ExamPayload {
  title: string;
  description: string;
  classId: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'published' | 'completed';
  questions: {
    text: string;
    type: 'mcq' | 'short_answer' | 'essay';
    topic?: string | null;
    options?: string[];
    correctAnswer?: string;
    marks: number;
  }[];
}

export interface ExamResponse {
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
  status: 'draft' | 'published' | 'completed';
  questions: {
    id: string;
    text: string;
    type: 'mcq' | 'short_answer' | 'essay';
    topic?: string | null;
    options?: string[];
    correctAnswer?: string;
    marks: number;
  }[];
  createdAt: string;
}

export const examApi = {
  create: (payload: unknown) =>
    request<ExamResponse>('POST', '/exams', payload, true),

  getAll: () =>
    request<ExamResponse[]>('GET', '/exams', undefined, true),

  getById: (examId: string) =>
    request<ExamResponse>('GET', `/exams/${examId}`, undefined, true),

  update: (id: string, payload: unknown) =>
    request<ExamResponse>('PUT', `/exams/${id}`, payload, true),

  remove: (id: string) =>
    request<{ success: boolean }>('DELETE', `/exams/${id}`, undefined, true),
};
