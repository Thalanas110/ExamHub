export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  joinedAt: string;
  phone?: string;
  bio?: string;
  department?: string;
}
