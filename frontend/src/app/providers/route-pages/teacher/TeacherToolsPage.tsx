import { useApp } from '@/app/providers/AppProvider';
import { TeacherTools } from '@/pages/teacher/TeacherTools';

export function TeacherToolsPage() {
  const { currentUser, users, classes, exams, submissions, addUser, updateClass, addExam, getUserById } = useApp();
  return <TeacherTools {...{ currentUser, users, classes, exams, submissions, addUser, updateClass, addExam, getUserById }} />;
}
