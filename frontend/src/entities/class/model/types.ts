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
