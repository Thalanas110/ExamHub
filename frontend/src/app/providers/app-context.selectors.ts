import type { Class, Exam, Submission, User } from '../data/types';

export function getUserById(users: User[], id: string) {
  return users.find(user => user.id === id);
}

export function getClassById(classes: Class[], id: string) {
  return classes.find(cls => cls.id === id);
}

export function getExamById(exams: Exam[], id: string) {
  return exams.find(exam => exam.id === id);
}

export function getSubmissionsByStudent(submissions: Submission[], studentId: string) {
  return submissions.filter(submission => submission.studentId === studentId);
}

export function getSubmissionsByExam(submissions: Submission[], examId: string) {
  return submissions.filter(submission => submission.examId === examId);
}

export function getStudentSubmission(submissions: Submission[], examId: string, studentId: string) {
  return submissions.find(submission => submission.examId === examId && submission.studentId === studentId);
}
