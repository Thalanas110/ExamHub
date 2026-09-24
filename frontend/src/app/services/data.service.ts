import { request } from '@/shared/api/request';
import type { ExamResponse } from './exam.service';
import type { ResultResponse } from './result.service';
import type { UserProfile } from './user.service';

export interface AllData {
  users: (UserProfile & { password?: string })[];
  exams: ExamResponse[];
  classes: unknown[];
  submissions: ResultResponse[];
}

export interface DataSummary {
  role: string;
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
  };
  exams: {
    total: number;
    draft: number;
    published: number;
    completed: number;
  };
  classes: {
    total: number;
    populated: number;
    empty: number;
  };
  submissions: {
    total: number;
    pending: number;
    graded: number;
    averageScore: number;
    passRate: number;
  };
}

export const dataApi = {
  getSummary: () => request<DataSummary>('GET', '/data/summary', undefined, true),
  getAll: () => request<AllData>('GET', '/data/all', undefined, true),

  reseed: (confirmationText: string) =>
    request<{ success: boolean; message: string }>('POST', '/data/reseed', { confirmationText }, true),
};
