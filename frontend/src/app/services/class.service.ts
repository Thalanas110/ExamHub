import { request } from '@/shared/api/request';

export const classApi = {
  getAll: () => request<unknown[]>('GET', '/classes', undefined, true),
  create: (payload: unknown) => request<unknown>('POST', '/classes', payload, true),
  update: (id: string, payload: unknown) => request<unknown>('PUT', `/classes/${id}`, payload, true),
  remove: (id: string) => request<{ success: boolean }>('DELETE', `/classes/${id}`, undefined, true),
  join: (code: string) => request<unknown>('POST', '/classes/join', { code }, true),
  leave: (classId: string) => request<unknown>('POST', `/classes/${classId}/leave`, {}, true),
  enroll: (classId: string, studentId: string) =>
    request<unknown>('POST', `/classes/${classId}/enroll`, { studentId }, true),
  removeStudent: (classId: string, studentId: string) =>
    request<unknown>('DELETE', `/classes/${classId}/students/${studentId}`, undefined, true),
};
