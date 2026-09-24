import { useApp } from '@/app/providers/AppProvider';
import { AdminTools } from '@/pages/admin/AdminTools';

export function AdminToolsPage() {
  const { currentUser, users, classes, exams, submissions, addUser, updateClass, addExam, getUserById } = useApp();
  return <AdminTools {...{ currentUser, users, classes, exams, submissions, addUser, updateClass, addExam, getUserById }} />;
}
