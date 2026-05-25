import { request } from './http/request';
import type { ExamResponse } from './exam.service';
import type { ResultResponse } from './result.service';
import type { UserProfile } from './user.service';

export interface AllData {
  users: (UserProfile & { password?: string })[];
  exams: ExamResponse[];
  classes: unknown[];
  submissions: ResultResponse[];
}

export const dataApi = {
  getAll: () => request<AllData>('GET', '/data/all', undefined, true),

  reseed: (confirmationText: string) =>
    request<{ success: boolean; message: string }>('POST', '/data/reseed', { confirmationText }, true),
};
