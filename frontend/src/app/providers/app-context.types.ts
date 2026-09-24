import type { Dispatch, SetStateAction } from 'react';
import type { Answer } from '@/entities/submission';
import type { Class } from '@/entities/class';
import type { Exam } from '@/entities/exam';
import type { Submission } from '@/entities/submission';
import type { User } from '@/entities/user';
import type { DataSummary } from '@/entities/admin';

export interface AppContextType {
  currentUser: User | null;
  apiLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  users: User[];
  classes: Class[];
  exams: Exam[];
  submissions: Submission[];
  summary: DataSummary | null;
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addClass: (cls: Omit<Class, 'id' | 'createdAt' | 'studentIds'>) => Class;
  updateClass: (id: string, data: Partial<Class>) => void;
  deleteClass: (id: string) => void;
  enrollStudent: (classId: string, studentId: string) => { success: boolean; error?: string };
  removeStudentFromClass: (classId: string, studentId: string) => void;
  joinClassByCode: (code: string, studentId: string) => Promise<{ success: boolean; error?: string }>;
  leaveClass: (classId: string, studentId: string) => void;
  addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => Promise<Exam>;
  updateExam: (id: string, data: Partial<Exam>) => Promise<Exam>;
  deleteExam: (id: string) => Promise<void>;
  submitExam: (submission: Omit<Submission, 'id'>) => void;
  gradeSubmission: (id: string, answers: { questionId: string; marksAwarded: number }[], feedback: string) => void;
  getUserById: (id: string) => User | undefined;
  getClassById: (id: string) => Class | undefined;
  getExamById: (id: string) => Exam | undefined;
  getSubmissionsByStudent: (studentId: string) => Submission[];
  getSubmissionsByExam: (examId: string) => Submission[];
  getStudentSubmission: (examId: string, studentId: string) => Submission | undefined;
}

export interface AppStateSetters {
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
  setApiLoading: Dispatch<SetStateAction<boolean>>;
  setUsers: Dispatch<SetStateAction<User[]>>;
  setClasses: Dispatch<SetStateAction<Class[]>>;
  setExams: Dispatch<SetStateAction<Exam[]>>;
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  setSummary: Dispatch<SetStateAction<DataSummary | null>>;
}

export interface AppDomainState {
  currentUser: User | null;
  users: User[];
  classes: Class[];
  exams: Exam[];
  submissions: Submission[];
}

export interface GradeAnswerInput {
  questionId: string;
  marksAwarded: number;
}

export type SubmissionPayload = Omit<Submission, 'id'>;
export type AnswerList = Answer[];
