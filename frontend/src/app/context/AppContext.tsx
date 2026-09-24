import React, { createContext, useContext, useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import type { Class, Exam, Submission, User } from '../data/types';
import type { DataSummary } from '../services/data.service';
import {
  getClassById,
  getExamById,
  getStudentSubmission,
  getSubmissionsByExam,
  getSubmissionsByStudent,
  getUserById,
} from '@/app/providers/app-context.selectors';
import { persistStoredUser, readStoredUser } from '@/app/providers/app-context.storage';
import type { AppContextType } from '@/app/providers/app-context.types';
import { createAuthDomain } from '@/app/providers/domains/auth-domain';
import { createClassDomain } from '@/app/providers/domains/class-domain';
import { createExamDomain } from '@/app/providers/domains/exam-domain';
import { createSubmissionDomain } from '@/app/providers/domains/submission-domain';
import { createUserDomain } from '@/app/providers/domains/user-domain';

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => readStoredUser());
  const [apiLoading, setApiLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);

  const setters = useMemo(() => ({
    setCurrentUser,
    setApiLoading,
    setUsers,
    setClasses,
    setExams,
    setSubmissions,
    setSummary,
  }), []);

  useEffect(() => {
    persistStoredUser(currentUser);
  }, [currentUser]);

  const authDomain = useMemo(
    () => createAuthDomain(setters),
    [setters],
  );

  const userDomain = useMemo(
    () => createUserDomain({ currentUser, ...setters }),
    [setters, currentUser],
  );

  const classDomain = useMemo(
    () => createClassDomain({ classes, users, ...setters }),
    [setters, classes, users],
  );

  const examDomain = useMemo(
    () => createExamDomain({ setExams }),
    [setExams],
  );

  const submissionDomain = useMemo(
    () => createSubmissionDomain({ exams, setSubmissions }),
    [setSubmissions, exams],
  );

  useEffect(() => {
    void authDomain.loadFromApi();
    // Intentionally run once on mount to restore authenticated data from storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AppContextType = {
    currentUser,
    apiLoading,
    login: authDomain.login,
    logout: authDomain.logout,
    register: authDomain.register,
    users,
    classes,
    exams,
    submissions,
    summary,
    addUser: userDomain.addUser,
    updateUser: userDomain.updateUser,
    deleteUser: userDomain.deleteUser,
    addClass: classDomain.addClass,
    updateClass: classDomain.updateClass,
    deleteClass: classDomain.deleteClass,
    enrollStudent: classDomain.enrollStudent,
    removeStudentFromClass: classDomain.removeStudentFromClass,
    joinClassByCode: classDomain.joinClassByCode,
    leaveClass: classDomain.leaveClass,
    addExam: examDomain.addExam,
    updateExam: examDomain.updateExam,
    deleteExam: examDomain.deleteExam,
    submitExam: submissionDomain.submitExam,
    gradeSubmission: submissionDomain.gradeSubmission,
    getUserById: (id: string) => getUserById(users, id),
    getClassById: (id: string) => getClassById(classes, id),
    getExamById: (id: string) => getExamById(exams, id),
    getSubmissionsByStudent: (studentId: string) => getSubmissionsByStudent(submissions, studentId),
    getSubmissionsByExam: (examId: string) => getSubmissionsByExam(submissions, examId),
    getStudentSubmission: (examId: string, studentId: string) =>
      getStudentSubmission(submissions, examId, studentId),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
};
