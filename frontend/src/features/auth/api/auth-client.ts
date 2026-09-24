import { request } from '@/shared/api/request';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'admin';
  department?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    joinedAt: string;
    department?: string;
    phone?: string;
    bio?: string;
  };
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('POST', '/auth/register', payload),

  login: (payload: LoginPayload) =>
    request<AuthResponse>('POST', '/auth/login', payload),

  logout: () =>
    request<{ success: boolean }>('DELETE', '/auth/logout', undefined, true),
};
