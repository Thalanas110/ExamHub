import { request } from '@/shared/api/request';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  department?: string;
  phone?: string;
  bio?: string;
  joinedAt: string;
}

export const userApi = {
  getProfile: () =>
    request<UserProfile>('GET', '/users/profile', undefined, true),

  updateProfile: (payload: Partial<Pick<UserProfile, 'name' | 'department' | 'phone' | 'bio'>>) =>
    request<UserProfile>('PUT', '/users/profile', payload, true),

  getAll: () =>
    request<UserProfile[]>('GET', '/users', undefined, true),

  create: (payload: unknown) =>
    request<UserProfile>('POST', '/users', payload, true),

  update: (id: string, payload: unknown) =>
    request<UserProfile>('PUT', `/users/${id}`, payload, true),

  remove: (id: string) =>
    request<{ success: boolean }>('DELETE', `/users/${id}`, undefined, true),
};
